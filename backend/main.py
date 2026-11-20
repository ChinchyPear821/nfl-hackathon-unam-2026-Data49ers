"""Backend "¿Se completará el pase?". Ejecuta: .venv/Scripts/uvicorn backend.main:app --reload"""
import os
from pathlib import Path
def cargar_env():
    f = Path(__file__).resolve().parent.parent / ".env"
    if f.exists():
        for linea in f.read_text(encoding="utf-8-sig").splitlines():
            linea = linea.strip()
            if linea and not linea.startswith("#") and "=" in linea:
                k, v = linea.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
cargar_env()
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="¿Se completará el pase?")
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# ── Carga (una vez, al arrancar) ─────────────────────────────────────────────
jugadas_df = pd.read_csv(DATA / "jugadas.csv", dtype={"receptor_id": str, "mejor_id": str})
frames_df = pd.read_csv(DATA / "frames.csv", dtype={"entidad_id": str})
seleccion_df = pd.read_csv(DATA / "seleccion.csv")
separacion_df = pd.read_csv(DATA / "separacion.csv")
opciones_df = pd.read_csv(DATA / "opciones.csv", dtype={"entidad_id": str})
qbs_df = pd.read_csv(DATA / "qbs.csv")
formaciones_df = pd.read_csv(DATA / "formaciones.csv")
equipos_df = pd.read_csv(DATA / "equipos.csv")   # solo cosmético: colores del marcador
presion_df = pd.read_csv(DATA / "presion.csv")   # veredicto de presión por jugada
curva_bolsillo_df = pd.read_csv(DATA / "curva_bolsillo.csv")
resumen_presion_df = pd.read_csv(DATA / "resumen_presion.csv")   # 8,524 jugadas de pase (con capturas)


def limpio(df: pd.DataFrame) -> list[dict]:
    """DataFrame -> lista de dicts JSON-seguros (NaN/inf -> None)."""
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.astype(object).where(df.notna(), None)
    return df.to_dict("records")


# 90 jugadas animables: historia + columnas de jugadas.csv, en el orden de seleccion.csv
_animables = (
    seleccion_df[["jugada_id", "historia"]]
    .merge(jugadas_df, on="jugada_id", how="inner")
    .merge(presion_df, on="jugada_id", how="left")
)
JUGADAS = limpio(_animables)
IDS_ANIMABLES = set(_animables["jugada_id"])

# frames por jugada, ya limpios y ordenados
FRAMES: dict[str, list[dict]] = {}
for jid, g in frames_df[frames_df["jugada_id"].isin(IDS_ANIMABLES)].groupby("jugada_id"):
    g = g.sort_values(["frame", "entidad_id"]).drop(columns=["jugada_id"])
    FRAMES[str(jid)] = limpio(g)

SEPARACION = limpio(separacion_df)
QBS = limpio(qbs_df)
FORMACIONES = limpio(formaciones_df)
EQUIPOS = limpio(equipos_df)
CURVA_BOLSILLO = limpio(curva_bolsillo_df.sort_values(["veredicto_presion", "seg"]))
PRESION = {r["jugada_id"]: r for r in limpio(presion_df)}

# opciones por jugada, de mayor a menor probabilidad
OPCIONES: dict[str, list[dict]] = {}
for jid, g in opciones_df.groupby("jugada_id"):
    g = g.sort_values(["prob_completo", "sep"], ascending=False).drop(columns=["jugada_id"])
    OPCIONES[str(jid)] = limpio(g)


def _resumen() -> dict:
    sep = separacion_df.set_index("sep_yd")["pct_completo"]
    rp = resumen_presion_df.set_index("veredicto_presion")
    return {
        "total_pases": int(len(jugadas_df)),
        "pct_completo_menos_1yd": float(sep.loc[0]),
        "pct_completo_8_mas": float(sep.loc[8]),
        "pct_hubo_mejor_opcion": float(jugadas_df["habia_mejor_opcion"].mean()),
        "jugadas_animables": len(JUGADAS),
        # presión, sobre las 8,524 jugadas de pase de resumen_presion.csv
        "presion_jugadas_pase": int(resumen_presion_df["jugadas"].sum()),
        "presion_pct_qb_retuvo": float(rp.loc["El QB retuvo el balón", "pct_de_presiones"]),
        "presion_pct_captura_qb_retuvo": float(rp.loc["El QB retuvo el balón", "pct_captura"]),
    }


RESUMEN = _resumen()


# ── API ──────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/resumen")
def get_resumen():
    return RESUMEN


@app.get("/api/separacion")
def get_separacion():
    return SEPARACION


@app.get("/api/jugadas")
def get_jugadas():
    return JUGADAS


@app.get("/api/jugadas/{jugada_id}/frames")
def get_frames(jugada_id: str):
    if jugada_id not in FRAMES:
        raise HTTPException(status_code=404, detail="Jugada no encontrada")
    return FRAMES[jugada_id]


@app.get("/api/jugadas/{jugada_id}/opciones")
def get_opciones(jugada_id: str):
    if jugada_id not in OPCIONES:
        raise HTTPException(status_code=404, detail="Jugada no encontrada")
    return OPCIONES[jugada_id]


@app.get("/api/qbs")
def get_qbs():
    return QBS


@app.get("/api/formaciones")
def get_formaciones():
    return FORMACIONES


@app.get("/api/equipos")
def get_equipos():
    return EQUIPOS


@app.get("/api/curva-bolsillo")
def get_curva_bolsillo():
    return CURVA_BOLSILLO


# ── IA opcional: comentarista con Amazon Nova (Bedrock) ─────────────────────
_NARRACIONES: dict[str, dict] = {}


def _num(v, fmt: str = "{:.1f}", sufijo: str = "") -> str:
    """Formatea un número; 'sin dato' si viene vacío."""
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return "sin dato"
    return fmt.format(v) + sufijo


def explicacion_presion(p: dict | None) -> str | None:
    """Misma frase que muestra el panel 'QB y presión' (PanelJugada.tsx)."""
    if not p or not p.get("veredicto_presion") or p["veredicto_presion"] == "Sin dato":
        return None
    tardo = f"el QB tardó {_num(p.get('seg_hasta_lanzar_o_captura'))} s"
    limpio_ = p["veredicto_presion"] == "Bolsillo limpio"
    if p.get("seg_rusher_a_2_5yd") is None:          # ningún rusher llegó a 2.5 yd
        frase = (f"Ningún rusher llegó a 2.5 yd (el más cercano, {p.get('rusher_mas_cercano') or 'sin dato'}, "
                 f"quedó a {_num(p.get('dist_rusher_final'))} yd); {tardo}.")
        return ("Sin presión. " + frase) if limpio_ else frase
    if limpio_:
        return f"Sin presión; {tardo}."
    return f"Presión de {p.get('rusher_mas_cercano')} a los {_num(p['seg_rusher_a_2_5yd'])} s; {tardo}."


def _datos_narracion(jugada_id: str, j: pd.Series) -> str:
    res = {"C": "pase completo", "I": "pase incompleto", "IN": "intercepción"}.get(j["resultado"], j["resultado"])
    local = j["ataque"] if bool(j["ataque_es_local"]) else j["defensa"]
    visita = j["defensa"] if bool(j["ataque_es_local"]) else j["ataque"]
    opciones = OPCIONES.get(jugada_id, [])
    mejor = next((o for o in opciones if o.get("es_mejor_opcion")), None)
    if mejor is None:
        alternativa = "Sin datos de opciones."
    else:
        alternativa = (
            f"Mejor opción al lanzar: #{mejor['camiseta']} {mejor['nombre']}, "
            f"{_num(mejor['sep'], sufijo=' yd')} de separación, "
            f"{_num(mejor['prob_completo'] * 100 if mejor['prob_completo'] is not None else None, '{:.0f}', '%')} "
            f"de pases así se completan; {'sí' if mejor.get('pasa_primer_down') else 'no'} pasaba la línea de primer down. "
            + ("Es el mismo receptor al que lanzó el QB: eligió la mejor opción." if mejor.get("es_objetivo")
               else "No es el receptor al que lanzó el QB.")
        )
    return (
        "CONTEXTO\n"
        f"- Ataque: {j['ataque']}. Defensa: {j['defensa']}. Local: {local}. Visitante: {visita}.\n"
        f"- Marcador: {j['ataque']} {int(j['marcador_ataque'])}, {j['defensa']} {int(j['marcador_defensa'])}.\n"
        f"- Cuarto {int(j['cuarto'])}, reloj {j['reloj']} por jugar en el cuarto.\n"
        f"- {int(j['down'])}a oportunidad y {int(j['yards_to_go'])} yardas por avanzar.\n"
        "LA JUGADA\n"
        f"- QB: {j['qb']}. Lanzó a #{j['receptor_camiseta']} {j['receptor']} con {_num(j['sep_objetivo'], sufijo=' yd')} de separación; "
        f"de los pases con esa separación se completa el {_num(j['prob_completo'] * 100, '{:.0f}', '%')}.\n"
        f"- Tiempo para lanzar: {_num(j['seg_para_lanzar'], sufijo=' s')}. "
        f"Rusher más cercano al QB al lanzar: {_num(j['dist_rusher'], sufijo=' yd')}.\n"
        f"- Veredicto de presión: \"{(PRESION.get(jugada_id) or {}).get('veredicto_presion') or 'sin dato'}\"\n"
        f"- Detalle de la presión: {explicacion_presion(PRESION.get(jugada_id)) or 'sin dato'}\n"
        f"- Resultado: {res}, {int(j['yardas'])} yardas. Descripción oficial: {j['descripcion']}\n"
        "QUÉ PUDO HACER\n"
        f"- {alternativa}"
    )


def _leer_narracion(texto: str) -> dict:
    """Extrae {contexto, jugada, alternativa} del texto del modelo; si no es JSON válido, todo va en 'jugada'."""
    import json
    limpio_txt = texto.strip()
    if limpio_txt.startswith("```"):
        limpio_txt = limpio_txt.strip("`")
        if limpio_txt.lower().startswith("json"):
            limpio_txt = limpio_txt[4:]
    ini, fin = limpio_txt.find("{"), limpio_txt.rfind("}")
    try:
        if ini < 0 or fin <= ini:
            raise ValueError("sin JSON")
        d = json.loads(limpio_txt[ini:fin + 1])
        partes = {k: (str(d[k]).strip() if d.get(k) not in (None, "") else None) for k in ("contexto", "jugada", "alternativa")}
        if not any(partes.values()):
            raise ValueError("JSON vacío")
        return partes
    except (ValueError, TypeError, AttributeError):
        return {"contexto": None, "jugada": texto.strip(), "alternativa": None}


@app.get("/api/jugadas/{jugada_id}/narracion")
def get_narracion(jugada_id: str):
    """Narración en tres partes. Si Bedrock no está disponible, responde disponible=False y la app sigue igual."""
    if jugada_id in _NARRACIONES:
        return {"disponible": True, **_NARRACIONES[jugada_id]}
    fila = jugadas_df[jugadas_df["jugada_id"] == jugada_id]
    if fila.empty:
        raise HTTPException(status_code=404, detail="Jugada no encontrada")
    datos = _datos_narracion(jugada_id, fila.iloc[0])
    prompt = (
        "Eres comentarista de una transmisión de futbol americano en español de México, "
        "para un público que no conoce el deporte. Usa SOLO los datos de abajo. "
        "No inventes nombres, cifras, jugadas ni hechos que no aparezcan; si un dato dice 'sin dato', no lo menciones. "
        "Escribe los equipos con su abreviatura tal como viene (por ejemplo CIN), sin nombre completo, ciudad ni estadio "
        "(di 'HOU es local', no 'estamos en Houston').\n"
        "Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, con tres claves:\n"
        '- "contexto": 1 o 2 oraciones con los equipos, quién es local, el marcador, el cuarto, el reloj, '
        "el down y las yardas por avanzar.\n"
        '- "jugada": 2 oraciones: a quién lanzó el QB, con qué separación y qué porcentaje de pases así se completan, '
        "cuánto tardó en lanzar, cuánta presión tenía y el resultado. "
        "Incluye el veredicto de presión con sus palabras exactas entre comillas "
        '(por ejemplo: el veredicto fue "El QB retuvo el balón").\n'
        '- "alternativa": 1 o 2 oraciones con la mejor opción (su separación, su porcentaje y si pasaba el primer down). '
        "Si el QB ya eligió la mejor opción, dilo así.\n"
        'Formato: {"contexto": "...", "jugada": "...", "alternativa": "..."}\n\n'
        "DATOS\n" + datos
    )
    try:
        import boto3
        cliente = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"))
        r = cliente.converse(
            modelId=os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-pro-v1:0"),
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 500, "temperature": 0.3},
        )
        texto = r["output"]["message"]["content"][0]["text"]
        partes = _leer_narracion(texto)
        _NARRACIONES[jugada_id] = partes
        return {"disponible": True, **partes}
    except Exception as e:  # sin llaves, sin red o modelo no disponible
        return {"disponible": False, "contexto": None, "jugada": None, "alternativa": None, "motivo": type(e).__name__}


# ── Frontend (producción) ────────────────────────────────────────────────────
DIST = ROOT / "dashboard" / "dist"
if DIST.exists():
    app.mount("/", StaticFiles(directory=str(DIST), html=True), name="static")
