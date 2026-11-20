"""Backend NFL UNAM. Ejecuta: .venv/Scripts/uvicorn backend.main:app --reload"""
import math, os
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

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
import pandas as pd

app = FastAPI(title="Hackathon NFL UNAM")

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# ── Carga ────────────────────────────────────────────────────────────────────
jugadas_df     = pd.read_csv(DATA / "jugadas.csv",      dtype=str)
frames_df      = pd.read_csv(DATA / "frames.csv",       dtype=str)
metricas_df    = pd.read_csv(DATA / "metricas.csv",     dtype=str)
players_df     = pd.read_csv(DATA / "players.csv",      dtype=str)
equipos_df     = pd.read_csv(DATA / "equipos.csv",      dtype=str)
curva_df       = pd.read_csv(DATA / "curva_ventaja.csv",dtype=str)
heatmap_df     = pd.read_csv(DATA / "heatmap.csv",      dtype=str)
clusters_df    = pd.read_csv(DATA / "clusters.csv",     dtype=str)

jugadas_animables = set(frames_df["jugada_id"].unique())

for col in ["yardas","epa","dist_receptor","dist_defensor","ventaja",
            "vel_requerida","vel_receptor","brecha_vel","distancia_pase","los_x","primer_down_x",
            "tiempo_vuelo_s","yards_to_go"]:
    if col in jugadas_df.columns:
        jugadas_df[col] = pd.to_numeric(jugadas_df[col], errors="coerce")

for col in ["jugadas","pct_completo","pct_intercepcion"]:
    metricas_df[col] = pd.to_numeric(metricas_df[col], errors="coerce")

for col in ["frame","x","y"]:
    frames_df[col] = pd.to_numeric(frames_df[col], errors="coerce")

for col in ["jugadas","vel_max",
            "veces_objetivo","pct_completo_objetivo","ventaja_prom_objetivo","yardas_objetivo",
            "qb_pases","qb_pct_completo","qb_pct_intercepcion","qb_ventaja_prom",
            "qb_distancia_prom","qb_epa_prom",
            "def_veces_cercano","def_pct_completo_permitido","def_intercepciones",
            "def_ventaja_prom_permitida",
            "pc1","pc2","vel_max_prom","acel_p90","profundidad",
            "desp_lateral","sinuosidad","ventaja_prom"]:
    if col in players_df.columns:
        players_df[col] = pd.to_numeric(players_df[col], errors="coerce")

for col in ["ventaja_yd","jugadas","pct_completo","pct_intercepcion"]:
    if col in curva_df.columns:
        curva_df[col] = pd.to_numeric(curva_df[col], errors="coerce")

for col in ["jugadas","pct_completo","ventaja_prom","epa_prom"]:
    if col in heatmap_df.columns:
        heatmap_df[col] = pd.to_numeric(heatmap_df[col], errors="coerce")

for col in ["jugadores","vel_max_prom","acel_p90","profundidad",
            "desp_lateral","sinuosidad","ventaja_prom"]:
    if col in clusters_df.columns:
        clusters_df[col] = pd.to_numeric(clusters_df[col], errors="coerce")

# ── Helpers ──────────────────────────────────────────────────────────────────
def _clean(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v

def _safe(df: pd.DataFrame):
    records = df.where(pd.notna(df), None).to_dict(orient="records")
    return [{k: _clean(v) for k, v in row.items()} for row in records]

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

# ── API ───────────────────────────────────────────────────────────────────────
@app.get("/api/plays")
def get_plays():
    df = jugadas_df[jugadas_df["jugada_id"].isin(jugadas_animables)].copy()
    return _safe(df)

@app.get("/api/plays/{jugada_id}/frames")
def get_frames(jugada_id: str):
    df = frames_df[frames_df["jugada_id"] == jugada_id]
    if df.empty:
        raise HTTPException(status_code=404, detail="Jugada no encontrada")
    return _safe(df)

@app.get("/api/metrics")
def get_metrics():
    total     = len(jugadas_df)
    completos = (jugadas_df["resultado"] == "C").sum()
    v5 = jugadas_df[jugadas_df["grupo_ventaja"] == "5 Receptor +5 yd"]
    d2 = jugadas_df[jugadas_df["grupo_ventaja"] == "1 Defensor +2 yd"]
    return {
        "totales": {
            "jugadas":                   int(total),
            "pct_completo_general":      round(completos / total, 4) if total else 0,
            "pct_completo_ventaja5":     round((v5["resultado"] == "C").sum()  / len(v5), 4) if len(v5) else 0,
            "pct_intercepcion_defensor2":round((d2["resultado"] == "IN").sum() / len(d2), 4) if len(d2) else 0,
        },
        "graficas": _safe(metricas_df),
    }

@app.get("/api/players")
def get_players():
    return _safe(players_df)

@app.get("/api/teams")
def get_teams():
    """Stats por equipo: como ataque (sus pases) y como defensa (pases que permitió)."""
    es_c  = jugadas_df["resultado"] == "C"
    es_in = jugadas_df["resultado"] == "IN"
    df = jugadas_df.assign(c=es_c.astype(float), i=es_in.astype(float))
    ata = df.groupby("ataque").agg(jugadas=("jugada_id", "size"), pct_completo=("c", "mean"),
                                   pct_intercepcion=("i", "mean"), epa_prom=("epa", "mean"),
                                   yardas_prom=("yardas", "mean"), ventaja_prom=("ventaja", "mean"))
    de = df.groupby("defensa").agg(def_jugadas=("jugada_id", "size"), def_pct_completo_permitido=("c", "mean"),
                                   def_intercepciones=("i", "sum"), def_ventaja_permitida=("ventaja", "mean"),
                                   def_epa_permitido=("epa", "mean"))
    res = ata.join(de, how="outer").reset_index().rename(columns={"index": "equipo"})
    res = res.rename(columns={res.columns[0]: "equipo"}).round(4)
    res["def_intercepciones"] = res["def_intercepciones"].astype("Int64")
    return _safe(res.sort_values("jugadas", ascending=False))


# ── Acto 3: decisión por situación ───────────────────────────────────────────
def _num(df):
    for c in df.columns:
        if c not in ("situacion", "ruta", "receptor", "entidad_id", "equipo"):
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df

situaciones_df = _num(pd.read_csv(DATA / "situaciones.csv", dtype=str))
sit_rutas_df   = _num(pd.read_csv(DATA / "situacion_rutas.csv", dtype=str))
rec_ruta_df    = _num(pd.read_csv(DATA / "receptores_ruta.csv", dtype=str))
rival_df       = _num(pd.read_csv(DATA / "rival.csv", dtype=str))

@app.get("/api/decision")
def get_decision():
    return {
        "situaciones": _safe(situaciones_df),
        "rutas": _safe(sit_rutas_df),
        "receptores": _safe(rec_ruta_df),
        "rival": _safe(rival_df),
    }


# ── IA opcional: narración de una jugada con Amazon Nova (Bedrock) ───────────
@app.get("/api/plays/{jugada_id}/narracion")
def narrar_jugada(jugada_id: str):
    """Explica la jugada en lenguaje sencillo. Si Bedrock no está disponible, responde disponible=False."""
    fila = jugadas_df[jugadas_df["jugada_id"] == jugada_id]
    if fila.empty:
        raise HTTPException(status_code=404, detail="Jugada no encontrada")
    j = fila.iloc[0]
    datos = (
        f"Descripción oficial: {j['descripcion']}\n"
        f"Resultado: {j['resultado']} (C=completo, I=incompleto, IN=intercepción)\n"
        f"QB: {j['qb']}. Receptor objetivo: {j['receptor']}. Defensor más cercano al punto de caída: {j.get('defensor')}\n"
        f"Ruta: {j['ruta']}. Cobertura: {j['cobertura']}. Distancia del pase: {j['distancia_pase']} yd\n"
        f"Al momento del lanzamiento: receptor a {j['dist_receptor']} yd del punto de caída, "
        f"defensor más cercano a {j['dist_defensor']} yd. Ventaja del receptor: {j['ventaja']} yd.\n"
        f"Velocidad que necesitaba el receptor: {j['vel_requerida']} yd/s; iba a {j['vel_receptor']} yd/s.\n"
        f"Contexto del estudio: con ventaja de 5+ yd se completa el 92% de los pases; "
        f"si el defensor está 2+ yd más cerca, solo el 44%."
    )
    prompt = (
        "Eres analista de futbol americano. Con SOLO estos datos, explica en español, en 3 oraciones cortas "
        "y para alguien que no conoce el deporte, qué pasó en la jugada y por qué la ventaja al lanzar "
        "ayuda a entender el resultado. No inventes datos que no estén aquí.\n\n" + datos
    )
    try:
        import boto3
        region = os.environ.get("AWS_REGION", "us-east-1")
        modelo = os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-pro-v1:0")
        cliente = boto3.client("bedrock-runtime", region_name=region)
        r = cliente.converse(
            modelId=modelo,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 300, "temperature": 0.3},
        )
        texto = r["output"]["message"]["content"][0]["text"]
        return {"disponible": True, "texto": texto}
    except Exception as e:  # sin credenciales, sin red o modelo no disponible: la app sigue funcionando
        return {"disponible": False, "texto": None, "motivo": type(e).__name__}


@app.get("/api/equipos")
def get_equipos():
    return _safe(equipos_df)

@app.get("/api/curva-ventaja")
def get_curva_ventaja():
    return _safe(curva_df)

@app.get("/api/heatmap")
def get_heatmap():
    return _safe(heatmap_df)

@app.get("/api/clusters")
def get_clusters():
    return _safe(clusters_df)

@app.get("/api/clusters/{cluster_id}/jugadores")
def get_cluster_jugadores(cluster_id: int):
    df = players_df[players_df["cluster"] == str(cluster_id)]
    if df.empty:
        raise HTTPException(status_code=404, detail="Cluster no encontrado")
    cols = [c for c in ["entidad_id","nombre","posicion","equipo","jugadas",
                        "vel_max","pc1","pc2","ventaja_prom_objetivo",
                        "pct_completo_objetivo","cluster_nombre"] if c in df.columns]
    return _safe(df[cols])

# ── Frontend (produccion) ─────────────────────────────────────────────────────
DIST = ROOT / "dashboard" / "dist"
if DIST.exists():
    app.mount("/", StaticFiles(directory=str(DIST), html=True), name="static")
