"""
Genera seed.sql (datos de demostración) a partir de definiciones en Python.

¿Por qué existe este archivo?
  Cada herramienta de cálculo se describe con un JSON ("definition") guardado en la
  tabla `tools`. Escribir ese JSON a mano en SQL es incómodo, así que aquí usamos
  pequeñas funciones (inp / out) y luego se genera seed.sql.
  Una vez que tengas el panel /admin, puedes crear herramientas desde ahí sin tocar este archivo.

Uso:   python generate_seed.py      (regenera seed.sql)
"""
import json, math
from pathlib import Path

# ---------- helpers de definición ----------
def inp(key, label, units=None, default=None, positive=False, nonneg=False, unit=None, hint=None):
    d = {"key": key, "label": label}
    if units: d["units"] = units
    if unit: d["unit"] = unit
    if default is not None: d["default"] = default
    if positive: d["positive"] = True
    if nonneg: d["nonnegative"] = True
    if hint: d["hint"] = hint
    return d

def out(key, label, expr, unit="", decimals=4, formula=None):
    d = {"key": key, "label": label, "expr": expr, "unit": unit, "decimals": decimals}
    if formula: d["formula"] = formula
    return d

def definition(inputs, outputs, invalid=None):
    d = {"inputs": inputs, "outputs": outputs}
    if invalid: d["invalid_message"] = invalid
    return d

LEN  = [["m", 1], ["cm", 0.01], ["mm", 0.001], ["km", 1000], ["ft", 0.3048], ["in", 0.0254]]
LENC = [["cm", 1], ["m", 100], ["mm", 0.1], ["in", 2.54]]
AREA = [["m²", 1], ["cm²", 1e-4], ["ha", 1e4], ["ft²", 0.09290304]]
AREAC = [["cm²", 1], ["m²", 1e4], ["mm²", 0.01]]
VOL  = [["m³", 1], ["L", 0.001], ["cm³", 1e-6], ["ft³", 0.028316846592]]
ANG  = [["°", 1], ["rad", 180 / math.pi], ["gon", 0.9]]
VEL  = [["m/s", 1], ["cm/s", 0.01], ["km/h", 1 / 3.6], ["ft/s", 0.3048]]
FLOW = [["m³/s", 1], ["L/s", 0.001], ["m³/h", 1 / 3600]]
TIME = [["s", 1], ["min", 60], ["h", 3600]]
FORCE = [["kN", 1], ["N", 0.001], ["kgf", 0.00980665], ["tf", 9.80665]]
DIAM = [["mm", 1], ["pulg", 25.4]]

CATEGORIES = [
    ("geometria", "Geometría", "Áreas, perímetros y volúmenes de figuras comunes.", "shapes"),
    ("topografia", "Topografía", "Pendientes, distancias, azimut, coordenadas y nivelación.", "compass"),
    ("concreto", "Concreto", "Volúmenes de elementos y cantidades de materiales.", "cube"),
    ("hidraulica", "Hidráulica", "Caudal, velocidad, Manning y relaciones básicas.", "droplet"),
    ("estructuras", "Estructuras", "Herramientas educativas de análisis estructural básico.", "building"),
    ("metrados", "Metrados", "Concreto, acero, muros, pisos y encofrado por elemento.", "list"),
    ("conversor", "Conversor", "Conversión precisa entre unidades de ingeniería.", "swap"),
    ("calculadora", "Calculadora", "Calculadora científica con historial.", "calc"),
]

# (categoría, slug, nombre, descripción, definición, solo_educativa)
T = []
def tool(cat, slug, name, desc, d, edu=False, kind="calculator"):
    T.append((cat, slug, name, desc, d, edu, kind))

# ---------------- GEOMETRÍA ----------------
b_h = [inp("b", "Base", LEN, 1, positive=True), inp("h", "Altura", LEN, 1, positive=True)]
tool("geometria", "rectangulo", "Rectángulo", "Área y perímetro de un rectángulo.",
     definition(b_h, [out("A", "Área", "b*h", "m²", 4, "A = b · h"), out("P", "Perímetro", "2*(b+h)", "m", 4, "P = 2 · (b + h)")]))
tool("geometria", "cuadrado", "Cuadrado", "Área, perímetro y diagonal de un cuadrado.",
     definition([inp("l", "Lado", LEN, 1, positive=True)],
                [out("A", "Área", "l^2", "m²", 4, "A = l²"), out("P", "Perímetro", "4*l", "m", 4, "P = 4 · l"),
                 out("d", "Diagonal", "l*sqrt(2)", "m", 4, "d = l · √2")]))
tool("geometria", "triangulo", "Triángulo (base y altura)", "Área de un triángulo a partir de su base y altura.",
     definition(b_h, [out("A", "Área", "b*h/2", "m²", 4, "A = b · h / 2")]))
tool("geometria", "triangulo-heron", "Triángulo (tres lados)", "Área y perímetro con la fórmula de Herón.",
     definition([inp("a", "Lado a", LEN, 3, positive=True), inp("b", "Lado b", LEN, 4, positive=True), inp("c", "Lado c", LEN, 5, positive=True)],
                [out("A", "Área", "sqrt(((a+b+c)/2)*((a+b+c)/2-a)*((a+b+c)/2-b)*((a+b+c)/2-c))", "m²", 4, "A = √(s·(s−a)·(s−b)·(s−c)),  s = (a+b+c)/2"),
                 out("P", "Perímetro", "a+b+c", "m", 4, "P = a + b + c")],
                "Los tres lados no forman un triángulo válido (cada lado debe ser menor que la suma de los otros dos)."))
tool("geometria", "circulo", "Círculo", "Área, circunferencia y diámetro a partir del radio.",
     definition([inp("r", "Radio", LEN, 1, positive=True)],
                [out("A", "Área", "pi*r^2", "m²", 4, "A = π · r²"), out("C", "Circunferencia", "2*pi*r", "m", 4, "C = 2 · π · r"),
                 out("D", "Diámetro", "2*r", "m", 4, "D = 2 · r")]))
tool("geometria", "trapecio", "Trapecio", "Área de un trapecio.",
     definition([inp("B", "Base mayor", LEN, 4, positive=True), inp("bm", "Base menor", LEN, 2, positive=True), inp("h", "Altura", LEN, 1, positive=True)],
                [out("A", "Área", "(B+bm)/2*h", "m²", 4, "A = (B + b) / 2 · h")]))
tool("geometria", "cilindro", "Cilindro", "Volumen y áreas de un cilindro.",
     definition([inp("r", "Radio", LEN, 1, positive=True), inp("h", "Altura", LEN, 2, positive=True)],
                [out("V", "Volumen", "pi*r^2*h", "m³", 4, "V = π · r² · h"), out("Al", "Área lateral", "2*pi*r*h", "m²", 4, "Aₗ = 2 · π · r · h"),
                 out("At", "Área total", "2*pi*r*(r+h)", "m²", 4, "Aₜ = 2 · π · r · (r + h)")]))
tool("geometria", "prisma", "Prisma rectangular", "Volumen y área total de un prisma rectangular.",
     definition([inp("l", "Largo", LEN, 2, positive=True), inp("a", "Ancho", LEN, 1, positive=True), inp("h", "Altura", LEN, 1, positive=True)],
                [out("V", "Volumen", "l*a*h", "m³", 4, "V = l · a · h"), out("At", "Área total", "2*(l*a+l*h+a*h)", "m²", 4, "Aₜ = 2 · (l·a + l·h + a·h)")]))
tool("geometria", "esfera", "Esfera", "Volumen y área superficial de una esfera.",
     definition([inp("r", "Radio", LEN, 1, positive=True)],
                [out("V", "Volumen", "4/3*pi*r^3", "m³", 4, "V = 4/3 · π · r³"), out("A", "Área superficial", "4*pi*r^2", "m²", 4, "A = 4 · π · r²")]))
tool("geometria", "cono", "Cono", "Volumen, generatriz y área lateral de un cono.",
     definition([inp("r", "Radio", LEN, 1, positive=True), inp("h", "Altura", LEN, 2, positive=True)],
                [out("V", "Volumen", "pi*r^2*h/3", "m³", 4, "V = π · r² · h / 3"), out("g", "Generatriz", "sqrt(r^2+h^2)", "m", 4, "g = √(r² + h²)"),
                 out("Al", "Área lateral", "pi*r*sqrt(r^2+h^2)", "m²", 4, "Aₗ = π · r · g")]))

# ---------------- TOPOGRAFÍA ----------------
tool("topografia", "pendiente", "Pendiente", "Pendiente entre dos puntos a partir del desnivel y la distancia horizontal.",
     definition([inp("dh", "Desnivel (Δh)", LEN, 2), inp("dx", "Distancia horizontal (Δx)", LEN, 20, positive=True)],
                [out("m", "Pendiente", "dh/dx", "m/m", 4, "m = Δh / Δx"), out("pct", "Pendiente en porcentaje", "100*dh/dx", "%", 2, "p = 100 · Δh / Δx"),
                 out("ang", "Ángulo", "deg(atan(dh/dx))", "°", 3, "α = arctan(Δh / Δx)")]))
tool("topografia", "pendiente-porcentaje", "Pendiente (%) a ángulo", "Convierte una pendiente en porcentaje a ángulo y razón.",
     definition([inp("p", "Pendiente", unit="%", default=10)],
                [out("m", "Pendiente", "p/100", "m/m", 4, "m = p / 100"), out("ang", "Ángulo", "deg(atan(p/100))", "°", 3, "α = arctan(p / 100)")]))
tool("topografia", "diferencia-altura", "Diferencia de altura", "Desnivel a partir de la distancia inclinada y el ángulo de elevación.",
     definition([inp("d", "Distancia inclinada", LEN, 50, positive=True), inp("ang", "Ángulo de elevación", ANG, 10)],
                [out("dh", "Diferencia de altura", "d*sin(rad(ang))", "m", 4, "Δh = d · sen(α)")]))
tool("topografia", "distancia-horizontal", "Distancia horizontal", "Reduce una distancia inclinada a horizontal.",
     definition([inp("d", "Distancia inclinada", LEN, 50, positive=True), inp("ang", "Ángulo de elevación", ANG, 10)],
                [out("dx", "Distancia horizontal", "d*cos(rad(ang))", "m", 4, "Δx = d · cos(α)")]))
tool("topografia", "distancia-inclinada", "Distancia inclinada", "Distancia inclinada a partir de Δx y Δh.",
     definition([inp("dx", "Distancia horizontal (Δx)", LEN, 20, positive=True), inp("dh", "Desnivel (Δh)", LEN, 2)],
                [out("d", "Distancia inclinada", "sqrt(dx^2+dh^2)", "m", 4, "d = √(Δx² + Δh²)"), out("ang", "Ángulo", "deg(atan(dh/dx))", "°", 3, "α = arctan(Δh / Δx)")]))
tool("topografia", "distancia-puntos", "Distancia entre puntos", "Distancia horizontal entre dos puntos con coordenadas (E, N).",
     definition([inp("x1", "Este punto 1 (E₁)", LEN, 0), inp("y1", "Norte punto 1 (N₁)", LEN, 0), inp("x2", "Este punto 2 (E₂)", LEN, 30), inp("y2", "Norte punto 2 (N₂)", LEN, 40)],
                [out("d", "Distancia", "sqrt((x2-x1)^2+(y2-y1)^2)", "m", 4, "d = √((E₂−E₁)² + (N₂−N₁)²)"),
                 out("dE", "ΔE", "x2-x1", "m", 4, "ΔE = E₂ − E₁"), out("dN", "ΔN", "y2-y1", "m", 4, "ΔN = N₂ − N₁")]))
tool("topografia", "coordenadas", "Coordenadas de un punto", "Calcula (E, N) de un punto desde un punto conocido, distancia y azimut.",
     definition([inp("e1", "Este conocido (E₁)", LEN, 500000), inp("n1", "Norte conocido (N₁)", LEN, 8000000),
                 inp("d", "Distancia", LEN, 100, positive=True), inp("az", "Azimut", ANG, 45)],
                [out("e2", "Este (E₂)", "e1+d*sin(rad(az))", "m", 3, "E₂ = E₁ + d · sen(Az)"), out("n2", "Norte (N₂)", "n1+d*cos(rad(az))", "m", 3, "N₂ = N₁ + d · cos(Az)")]))
tool("topografia", "azimut", "Azimut entre puntos", "Azimut y distancia de P1 a P2 a partir de sus coordenadas.",
     definition([inp("x1", "Este punto 1 (E₁)", LEN, 0), inp("y1", "Norte punto 1 (N₁)", LEN, 0), inp("x2", "Este punto 2 (E₂)", LEN, 30), inp("y2", "Norte punto 2 (N₂)", LEN, 40)],
                [out("az", "Azimut", "mod(deg(atan2(x2-x1,y2-y1)),360)", "°", 4, "Az = arctan2(ΔE, ΔN)  (0° a 360°)"),
                 out("d", "Distancia", "sqrt((x2-x1)^2+(y2-y1)^2)", "m", 4, "d = √(ΔE² + ΔN²)")],
                "Los dos puntos son iguales: no se puede definir un azimut."))
tool("topografia", "angulos", "Ángulo entre alineaciones", "Ángulo entre dos azimuts.",
     definition([inp("az1", "Azimut 1", ANG, 30), inp("az2", "Azimut 2", ANG, 120)],
                [out("a", "Ángulo (sentido horario)", "mod(az2-az1,360)", "°", 4, "θ = (Az₂ − Az₁) mod 360°"),
                 out("m", "Ángulo menor", "min(mod(az2-az1,360),360-mod(az2-az1,360))", "°", 4, "θ_menor = mín(θ, 360° − θ)")]))
tool("topografia", "grados-radianes", "Grados, radianes y gradianes", "Convierte un ángulo en grados decimales a radianes, gradianes y G° M' S''.",
     definition([inp("g", "Ángulo en grados decimales", unit="°", default=45.5, nonneg=True)],
                [out("r", "Radianes", "rad(g)", "rad", 6, "rad = g · π / 180"), out("gon", "Gradianes", "g*10/9", "gon", 4, "gon = g · 10 / 9"),
                 out("gd", "Grados", "floor(g)", "°", 0), out("mn", "Minutos", "floor((g-floor(g))*60)", "'", 0),
                 out("sg", "Segundos", "((g-floor(g))*60-floor((g-floor(g))*60))*60", "''", 2)]))
tool("topografia", "nivelacion", "Nivelación geométrica", "Altura del instrumento y cota de un punto con lecturas de mira.",
     definition([inp("cota", "Cota del BM", LEN, 100), inp("la", "Lectura atrás (+)", LEN, 1.5, nonneg=True), inp("lv", "Lectura adelante (−)", LEN, 0.8, nonneg=True)],
                [out("hi", "Altura del instrumento", "cota+la", "m", 3, "HI = Cota BM + L. atrás"), out("cp", "Cota del punto", "cota+la-lv", "m", 3, "Cota = HI − L. adelante"),
                 out("dz", "Desnivel", "la-lv", "m", 3, "Δz = L. atrás − L. adelante")]))

# ---------------- CONCRETO ----------------
tool("concreto", "losa", "Volumen de losa", "Volumen de concreto de una losa, con porcentaje de desperdicio.",
     definition([inp("L", "Largo", LEN, 5, positive=True), inp("a", "Ancho", LEN, 4, positive=True), inp("e", "Espesor", LEN, 0.2, positive=True),
                 inp("desp", "Desperdicio", unit="%", default=5, nonneg=True)],
                [out("V", "Volumen neto", "L*a*e", "m³", 3, "V = L · a · e"), out("Vt", "Volumen con desperdicio", "L*a*e*(1+desp/100)", "m³", 3, "Vₜ = V · (1 + desperdicio/100)")]))
tool("concreto", "columna", "Volumen de columna", "Volumen de columnas rectangulares.",
     definition([inp("b", "Lado b", LEN, 0.3, positive=True), inp("h", "Lado h", LEN, 0.4, positive=True), inp("H", "Altura", LEN, 3, positive=True), inp("n", "Cantidad", unit="und", default=1, positive=True)],
                [out("V", "Volumen", "b*h*H*n", "m³", 3, "V = b · h · H · n")]))
tool("concreto", "columna-circular", "Volumen de columna circular", "Volumen de columnas circulares.",
     definition([inp("D", "Diámetro", LEN, 0.4, positive=True), inp("H", "Altura", LEN, 3, positive=True), inp("n", "Cantidad", unit="und", default=1, positive=True)],
                [out("V", "Volumen", "pi*D^2/4*H*n", "m³", 3, "V = π · D² / 4 · H · n")]))
tool("concreto", "viga", "Volumen de viga", "Volumen de vigas rectangulares.",
     definition([inp("b", "Ancho b", LEN, 0.25, positive=True), inp("h", "Peralte h", LEN, 0.5, positive=True), inp("L", "Longitud", LEN, 4, positive=True), inp("n", "Cantidad", unit="und", default=1, positive=True)],
                [out("V", "Volumen", "b*h*L*n", "m³", 3, "V = b · h · L · n")]))
tool("concreto", "zapata", "Volumen de zapata", "Volumen de zapatas aisladas rectangulares.",
     definition([inp("L", "Largo", LEN, 1.5, positive=True), inp("B", "Ancho", LEN, 1.5, positive=True), inp("h", "Peralte", LEN, 0.6, positive=True), inp("n", "Cantidad", unit="und", default=1, positive=True)],
                [out("V", "Volumen", "L*B*h*n", "m³", 3, "V = L · B · h · n")]))
tool("concreto", "cantidades", "Cantidades de materiales", "Materiales aproximados para un volumen de concreto. Los rendimientos por m³ son editables.",
     definition([inp("V", "Volumen de concreto", VOL, 1, positive=True),
                 inp("bol", "Cemento por m³", unit="bolsas/m³", default=9.73, positive=True, hint="Valor referencial; depende de la dosificación."),
                 inp("ar", "Arena por m³", unit="m³/m³", default=0.52, positive=True), inp("pi", "Piedra por m³", unit="m³/m³", default=0.53, positive=True),
                 inp("ag", "Agua por m³", unit="m³/m³", default=0.186, positive=True)],
                [out("c", "Cemento", "V*bol", "bolsas", 1, "Cemento = V · bolsas/m³"), out("a", "Arena", "V*ar", "m³", 3), out("p", "Piedra", "V*pi", "m³", 3),
                 out("w", "Agua", "V*ag*1000", "L", 0)]), edu=True)

# ---------------- HIDRÁULICA ----------------
tool("hidraulica", "caudal", "Caudal (Q = A · v)", "Caudal a partir del área y la velocidad.",
     definition([inp("A", "Área de flujo", AREA, 0.1, positive=True), inp("v", "Velocidad", VEL, 1.5, positive=True)],
                [out("Q", "Caudal", "A*v", "m³/s", 5, "Q = A · v"), out("QL", "Caudal", "A*v*1000", "L/s", 2)]))
tool("hidraulica", "velocidad", "Velocidad (v = Q / A)", "Velocidad media a partir del caudal y el área.",
     definition([inp("Q", "Caudal", FLOW, 0.05, positive=True), inp("A", "Área de flujo", AREA, 0.1, positive=True)],
                [out("v", "Velocidad", "Q/A", "m/s", 4, "v = Q / A")]))
tool("hidraulica", "area-tuberia", "Sección de tubería llena", "Área, perímetro mojado y radio hidráulico de una tubería a sección llena.",
     definition([inp("D", "Diámetro interior", LEN, 0.2, positive=True)],
                [out("A", "Área", "pi*D^2/4", "m²", 5, "A = π · D² / 4"), out("P", "Perímetro mojado", "pi*D", "m", 4, "P = π · D"), out("R", "Radio hidráulico", "D/4", "m", 4, "R = A / P = D / 4")]))
tool("hidraulica", "caudal-volumen", "Caudal por volumen y tiempo", "Caudal a partir de un volumen y el tiempo de llenado.",
     definition([inp("V", "Volumen", VOL, 0.02, positive=True), inp("t", "Tiempo", TIME, 10, positive=True)],
                [out("Q", "Caudal", "V/t", "m³/s", 6, "Q = V / t"), out("QL", "Caudal", "V/t*1000", "L/s", 3)]))
tool("hidraulica", "manning", "Ecuación de Manning", "Velocidad y caudal en flujo a superficie libre.",
     definition([inp("n", "Coeficiente de rugosidad n", unit="", default=0.013, positive=True), inp("R", "Radio hidráulico", LEN, 0.1, positive=True),
                 inp("S", "Pendiente", unit="m/m", default=0.005, positive=True), inp("A", "Área mojada", AREA, 0.1, positive=True)],
                [out("v", "Velocidad", "(1/n)*R^(2/3)*S^(1/2)", "m/s", 4, "v = (1/n) · R^(2/3) · S^(1/2)"), out("Q", "Caudal", "A*(1/n)*R^(2/3)*S^(1/2)", "m³/s", 5, "Q = A · v")]))
tool("hidraulica", "reynolds", "Número de Reynolds", "Régimen de flujo en tuberías.",
     definition([inp("rho", "Densidad", unit="kg/m³", default=1000, positive=True), inp("v", "Velocidad", VEL, 1, positive=True),
                 inp("D", "Diámetro", LEN, 0.1, positive=True), inp("mu", "Viscosidad dinámica", unit="Pa·s", default=0.001, positive=True)],
                [out("Re", "Número de Reynolds", "rho*v*D/mu", "", 0, "Re = ρ · v · D / μ")]))

# ---------------- ESTRUCTURAS (solo referencial) ----------------
tool("estructuras", "viga-simple-uniforme", "Viga simple con carga uniforme", "Reacciones y momento máximo de una viga simplemente apoyada.",
     definition([inp("w", "Carga uniforme", unit="kN/m", default=10, positive=True), inp("L", "Luz", LEN, 5, positive=True)],
                [out("R", "Reacción en cada apoyo", "w*L/2", "kN", 3, "R = w · L / 2"), out("M", "Momento máximo", "w*L^2/8", "kN·m", 3, "M_máx = w · L² / 8")]), edu=True)
tool("estructuras", "viga-puntual", "Viga simple con carga puntual central", "Reacciones y momento máximo con una carga al centro.",
     definition([inp("P", "Carga puntual", FORCE, 20, positive=True), inp("L", "Luz", LEN, 4, positive=True)],
                [out("R", "Reacción en cada apoyo", "P/2", "kN", 3, "R = P / 2"), out("M", "Momento máximo", "P*L/4", "kN·m", 3, "M_máx = P · L / 4")]), edu=True)
tool("estructuras", "viga-flecha", "Flecha en viga simple (carga uniforme)", "Deflexión máxima al centro de la luz.",
     definition([inp("w", "Carga uniforme", unit="kN/m", default=10, positive=True), inp("L", "Luz", LEN, 5, positive=True),
                 inp("E", "Módulo de elasticidad", unit="GPa", default=21, positive=True), inp("I", "Inercia", unit="cm⁴", default=40000, positive=True)],
                [out("d", "Flecha máxima", "1000*5*w*L^4/(384*E*1e6*I*1e-8)", "mm", 3, "δ = 5 · w · L⁴ / (384 · E · I)")]), edu=True)
tool("estructuras", "esfuerzo-axial", "Esfuerzo axial", "Esfuerzo normal σ = P / A.",
     definition([inp("P", "Fuerza axial", FORCE, 100, positive=True), inp("A", "Área", AREAC, 50, positive=True)],
                [out("s", "Esfuerzo", "10*P/A", "MPa", 3, "σ = P / A")]), edu=True)
tool("estructuras", "propiedades-rectangulo", "Propiedades de sección rectangular", "Área, inercia y módulo de sección.",
     definition([inp("b", "Base b", LENC, 25, positive=True), inp("h", "Altura h", LENC, 50, positive=True)],
                [out("A", "Área", "b*h", "cm²", 2, "A = b · h"), out("I", "Inercia", "b*h^3/12", "cm⁴", 1, "I = b · h³ / 12"),
                 out("S", "Módulo de sección", "b*h^2/6", "cm³", 1, "S = b · h² / 6"), out("r", "Radio de giro", "h/sqrt(12)", "cm", 3, "r = h / √12")]), edu=True)

# ---------------- METRADOS ----------------
tool("metrados", "metrado-concreto", "Concreto (elemento general)", "Volumen de concreto de cualquier elemento prismático.",
     definition([inp("L", "Largo", LEN, 3, positive=True), inp("a", "Ancho", LEN, 0.3, positive=True), inp("h", "Alto", LEN, 0.3, positive=True), inp("n", "Cantidad", unit="und", default=1, positive=True)],
                [out("V", "Volumen", "L*a*h*n", "m³", 3, "V = L · a · h · n")]))
tool("metrados", "metrado-acero", "Acero de refuerzo", "Peso de barras corrugadas con P = d² / 162 (kg/m, d en mm).",
     definition([inp("d", "Diámetro de barra", DIAM, 12, positive=True), inp("L", "Longitud por barra", LEN, 6, positive=True), inp("n", "Cantidad de barras", unit="und", default=10, positive=True)],
                [out("p", "Peso por metro", "d^2/162", "kg/m", 3, "p = d² / 162"), out("Lt", "Longitud total", "L*n", "m", 2), out("W", "Peso total", "d^2/162*L*n", "kg", 2, "W = p · L · n")]))
tool("metrados", "metrado-muros", "Muros de albañilería", "Área neta, volumen y unidades de ladrillo.",
     definition([inp("L", "Longitud", LEN, 5, positive=True), inp("H", "Altura", LEN, 2.4, positive=True), inp("t", "Espesor", LEN, 0.15, positive=True),
                 inp("hu", "Área de vanos", AREA, 0, nonneg=True), inp("u", "Ladrillos por m²", unit="und/m²", default=39, positive=True, hint="Referencial: depende del aparejo y la unidad.")],
                [out("Ab", "Área bruta", "L*H", "m²", 2, "A = L · H"), out("An", "Área neta", "L*H-hu", "m²", 2, "Aₙ = A − vanos"),
                 out("V", "Volumen de muro", "(L*H-hu)*t", "m³", 3), out("N", "Ladrillos", "(L*H-hu)*u", "und", 0, "N = Aₙ · und/m²")],
                "El área de vanos no puede ser mayor que el área del muro."))
tool("metrados", "metrado-pisos", "Pisos y acabados", "Área de piso con desperdicio y perímetro para zócalo.",
     definition([inp("L", "Largo", LEN, 5, positive=True), inp("a", "Ancho", LEN, 4, positive=True), inp("desp", "Desperdicio", unit="%", default=5, nonneg=True)],
                [out("A", "Área", "L*a", "m²", 2, "A = L · a"), out("At", "Área con desperdicio", "L*a*(1+desp/100)", "m²", 2), out("P", "Perímetro", "2*(L+a)", "m", 2)]))
tool("metrados", "metrado-columnas", "Columnas", "Concreto y encofrado de columnas rectangulares.",
     definition([inp("b", "Lado b", LEN, 0.3, positive=True), inp("h", "Lado h", LEN, 0.4, positive=True), inp("H", "Altura", LEN, 3, positive=True), inp("n", "Cantidad", unit="und", default=4, positive=True)],
                [out("V", "Concreto", "b*h*H*n", "m³", 3, "V = b · h · H · n"), out("E", "Encofrado", "2*(b+h)*H*n", "m²", 2, "E = 2 · (b + h) · H · n")]))
tool("metrados", "metrado-vigas", "Vigas", "Concreto y encofrado (fondo y dos costados).",
     definition([inp("b", "Ancho b", LEN, 0.25, positive=True), inp("h", "Peralte h", LEN, 0.5, positive=True), inp("L", "Longitud", LEN, 4, positive=True), inp("n", "Cantidad", unit="und", default=4, positive=True)],
                [out("V", "Concreto", "b*h*L*n", "m³", 3, "V = b · h · L · n"), out("E", "Encofrado", "(b+2*h)*L*n", "m²", 2, "E = (b + 2·h) · L · n")]))
tool("metrados", "metrado-losas", "Losas", "Concreto y encofrado de losas macizas.",
     definition([inp("L", "Largo", LEN, 5, positive=True), inp("a", "Ancho", LEN, 4, positive=True), inp("e", "Espesor", LEN, 0.2, positive=True)],
                [out("V", "Concreto", "L*a*e", "m³", 3, "V = L · a · e"), out("E", "Encofrado", "L*a", "m²", 2, "E = L · a")]))
tool("metrados", "metrado-zapatas", "Zapatas", "Concreto y excavación de zapatas aisladas.",
     definition([inp("L", "Largo", LEN, 1.5, positive=True), inp("B", "Ancho", LEN, 1.5, positive=True), inp("h", "Peralte", LEN, 0.6, positive=True),
                 inp("Hx", "Profundidad de excavación", LEN, 1.2, positive=True), inp("sob", "Sobreancho por lado", LEN, 0.1, nonneg=True), inp("n", "Cantidad", unit="und", default=4, positive=True)],
                [out("V", "Concreto", "L*B*h*n", "m³", 3, "V = L · B · h · n"), out("Ex", "Excavación", "(L+2*sob)*(B+2*sob)*Hx*n", "m³", 3, "Vₑ = (L+2s) · (B+2s) · Hₑ · n")]))

# ---------------- Herramientas con interfaz propia ----------------
tool("conversor", "conversor-unidades", "Conversor de unidades", "Longitud, área, volumen, masa, fuerza, presión, tiempo, temperatura, ángulo y más.", {}, kind="converter")
tool("calculadora", "calculadora-cientifica", "Calculadora científica", "Operaciones, paréntesis, trigonometría, logaritmos y constantes.", {}, kind="scientific")

FORMULAS = [
    # slug, categoría, herramienta, nombre, expresión, descripción, explicación, ejemplo, destacada, variables[(sym,name,unit,desc)]
    ("pendiente", "topografia", "pendiente", "Pendiente", "m = Δh / Δx",
     "Relación entre el desnivel y la distancia horizontal entre dos puntos.",
     "Se expresa como razón (m/m) o en porcentaje multiplicando por 100. El signo indica si el terreno sube o baja en el sentido del recorrido.",
     "Δh = 2 m y Δx = 20 m → m = 0,10 = 10 %.", True,
     [("m", "Pendiente", "m/m", "Razón entre desnivel y distancia horizontal"), ("Δh", "Desnivel", "m", "Diferencia de cotas"), ("Δx", "Distancia horizontal", "m", "Distancia medida en planta")]),
    ("distancia-inclinada", "topografia", "distancia-inclinada", "Distancia inclinada", "d = √(Δx² + Δh²)",
     "Teorema de Pitágoras aplicado a la distancia entre dos puntos con desnivel.", "Δx y Δh forman los catetos de un triángulo rectángulo; d es la hipotenusa.",
     "Δx = 20 m y Δh = 2 m → d = 20,10 m.", False,
     [("d", "Distancia inclinada", "m", ""), ("Δx", "Distancia horizontal", "m", ""), ("Δh", "Desnivel", "m", "")]),
    ("area-circulo", "geometria", "circulo", "Área del círculo", "A = π · r²", "Superficie encerrada por una circunferencia.", "El área crece con el cuadrado del radio.",
     "r = 0,5 m → A = 0,7854 m².", False, [("A", "Área", "m²", ""), ("r", "Radio", "m", "")]),
    ("volumen-cilindro", "geometria", "cilindro", "Volumen del cilindro", "V = π · r² · h", "Volumen de un cilindro circular recto.", "Área de la base por la altura.",
     "r = 0,2 m y h = 3 m → V = 0,377 m³.", True, [("V", "Volumen", "m³", ""), ("r", "Radio", "m", ""), ("h", "Altura", "m", "")]),
    ("ecuacion-continuidad", "hidraulica", "caudal", "Ecuación de continuidad", "Q = A · v", "Relaciona caudal, área de flujo y velocidad media.",
     "Para flujo incompresible el caudal es constante a lo largo del conducto.", "A = 0,1 m² y v = 1,5 m/s → Q = 0,15 m³/s.", True,
     [("Q", "Caudal", "m³/s", ""), ("A", "Área de flujo", "m²", ""), ("v", "Velocidad media", "m/s", "")]),
    ("manning", "hidraulica", "manning", "Ecuación de Manning", "v = (1/n) · R^(2/3) · S^(1/2)", "Velocidad media en flujo uniforme a superficie libre.",
     "n depende de la rugosidad del material; R es el radio hidráulico y S la pendiente de fondo.", "n = 0,013; R = 0,1 m; S = 0,005 → v ≈ 1,17 m/s.", False,
     [("v", "Velocidad", "m/s", ""), ("n", "Rugosidad de Manning", "—", ""), ("R", "Radio hidráulico", "m", "Área mojada / perímetro mojado"), ("S", "Pendiente", "m/m", "")]),
    ("momento-viga-simple", "estructuras", "viga-simple-uniforme", "Momento máximo en viga simple", "M_máx = w · L² / 8",
     "Momento flector máximo para carga uniforme en una viga simplemente apoyada.", "Ocurre al centro de la luz. Uso educativo: el diseño real requiere normativa y criterio profesional.",
     "w = 10 kN/m y L = 5 m → M = 31,25 kN·m.", False, [("M", "Momento máximo", "kN·m", ""), ("w", "Carga uniforme", "kN/m", ""), ("L", "Luz", "m", "")]),
    ("esfuerzo-normal", "estructuras", "esfuerzo-axial", "Esfuerzo normal", "σ = P / A", "Esfuerzo promedio por una fuerza axial sobre una sección.", "Se compara con el esfuerzo admisible del material.",
     "P = 100 kN y A = 50 cm² → σ = 200 MPa.", False, [("σ", "Esfuerzo", "MPa", ""), ("P", "Fuerza axial", "kN", ""), ("A", "Área", "cm²", "")]),
    ("peso-acero", "metrados", "metrado-acero", "Peso del acero corrugado", "p = d² / 162", "Peso aproximado por metro de barra con d en milímetros.",
     "Deriva de π/4 · d² · 7850 kg/m³. Da p en kg/m.", "d = 12 mm → p = 0,889 kg/m.", False, [("p", "Peso por metro", "kg/m", ""), ("d", "Diámetro", "mm", "")]),
]

MATERIALS = [
    ("concreto-armado", "Concreto armado", "Concreto", "Concreto simple con refuerzo de acero.", {"Peso específico": "2400 kg/m³", "Uso": "Elementos estructurales"}, "Valores referenciales."),
    ("acero-corrugado", "Acero corrugado", "Acero", "Barras de refuerzo para concreto armado.", {"Densidad": "7850 kg/m³", "Módulo de elasticidad": "200 GPa", "fy típico": "420 MPa"}, "Verificar la norma y el grado del acero."),
    ("cemento-portland", "Cemento Portland", "Aglomerantes", "Cemento hidráulico de uso general.", {"Peso de bolsa": "42,5 kg", "Peso específico": "3150 kg/m³"}, ""),
    ("arena-gruesa", "Arena gruesa", "Agregados", "Agregado fino para concreto y morteros.", {"Peso unitario suelto": "1500–1700 kg/m³"}, "Varía según cantera y humedad."),
    ("piedra-chancada", "Piedra chancada", "Agregados", "Agregado grueso para concreto.", {"Peso unitario suelto": "1450–1650 kg/m³"}, "Varía según cantera y tamaño máximo."),
    ("agua", "Agua", "Líquidos", "Agua para mezclas.", {"Densidad": "1000 kg/m³", "Viscosidad (20 °C)": "0,001 Pa·s"}, ""),
]

U = []
def units(quantity, label, rows, base):
    for i, (sym, name, factor, *off) in enumerate(rows):
        U.append((quantity, label, sym, name, factor, off[0] if off else 0.0, sym == base, i))

units("longitud", "Longitud", [("mm", "milímetro", 0.001), ("cm", "centímetro", 0.01), ("m", "metro", 1), ("km", "kilómetro", 1000), ("in", "pulgada", 0.0254), ("ft", "pie", 0.3048), ("yd", "yarda", 0.9144), ("mi", "milla", 1609.344)], "m")
units("area", "Área", [("mm²", "milímetro cuadrado", 1e-6), ("cm²", "centímetro cuadrado", 1e-4), ("m²", "metro cuadrado", 1), ("ha", "hectárea", 1e4), ("km²", "kilómetro cuadrado", 1e6), ("in²", "pulgada cuadrada", 0.00064516), ("ft²", "pie cuadrado", 0.09290304), ("acre", "acre", 4046.8564224)], "m²")
units("volumen", "Volumen", [("cm³", "centímetro cúbico", 1e-6), ("L", "litro", 0.001), ("m³", "metro cúbico", 1), ("in³", "pulgada cúbica", 1.6387064e-5), ("ft³", "pie cúbico", 0.028316846592), ("gal", "galón (EE. UU.)", 0.003785411784), ("yd³", "yarda cúbica", 0.764554857984)], "m³")
units("masa", "Masa", [("g", "gramo", 0.001), ("kg", "kilogramo", 1), ("t", "tonelada métrica", 1000), ("lb", "libra", 0.45359237), ("oz", "onza", 0.028349523125)], "kg")
units("fuerza", "Fuerza", [("N", "newton", 1), ("kN", "kilonewton", 1000), ("MN", "meganewton", 1e6), ("kgf", "kilogramo-fuerza", 9.80665), ("tf", "tonelada-fuerza", 9806.65), ("lbf", "libra-fuerza", 4.4482216152605), ("kip", "kip", 4448.2216152605)], "N")
units("presion", "Presión y esfuerzo", [("Pa", "pascal", 1), ("kPa", "kilopascal", 1000), ("MPa", "megapascal", 1e6), ("bar", "bar", 1e5), ("atm", "atmósfera", 101325), ("kgf/cm²", "kgf por cm²", 98066.5), ("tf/m²", "tf por m²", 9806.65), ("psi", "libra por pulgada²", 6894.757293168), ("ksi", "kip por pulgada²", 6894757.293168)], "Pa")
units("tiempo", "Tiempo", [("ms", "milisegundo", 0.001), ("s", "segundo", 1), ("min", "minuto", 60), ("h", "hora", 3600), ("día", "día", 86400), ("sem", "semana", 604800)], "s")
units("temperatura", "Temperatura", [("°C", "grado Celsius", 1, 0.0), ("K", "kelvin", 1, -273.15), ("°F", "grado Fahrenheit", 5 / 9, -160 / 9)], "°C")
units("angulo", "Ángulo", [("°", "grado", 1), ("rad", "radián", 180 / math.pi), ("gon", "gradián", 0.9), ("'", "minuto de arco", 1 / 60), ("''", "segundo de arco", 1 / 3600), ("rev", "revolución", 360)], "°")
units("velocidad", "Velocidad", [("m/s", "metro por segundo", 1), ("km/h", "kilómetro por hora", 1 / 3.6), ("ft/s", "pie por segundo", 0.3048), ("mph", "milla por hora", 0.44704), ("kn", "nudo", 1852 / 3600)], "m/s")
units("caudal", "Caudal", [("m³/s", "metro cúbico por segundo", 1), ("L/s", "litro por segundo", 0.001), ("m³/h", "metro cúbico por hora", 1 / 3600), ("L/min", "litro por minuto", 1 / 60000), ("gpm", "galón por minuto", 6.30901964e-5)], "m³/s")
units("densidad", "Densidad", [("kg/m³", "kilogramo por m³", 1), ("g/cm³", "gramo por cm³", 1000), ("t/m³", "tonelada por m³", 1000), ("lb/ft³", "libra por pie³", 16.01846337)], "kg/m³")

# ---------- generación del SQL ----------
def q(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)): return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

def j(v): return q(json.dumps(v, ensure_ascii=False)) + "::jsonb"

L = ["-- Datos de demostración (generado por generate_seed.py). Ejecutar DESPUÉS de schema.sql.", "BEGIN;", ""]
for i, (slug, name, desc, icon) in enumerate(CATEGORIES, 1):
    L.append(f"INSERT INTO categories (slug,name,description,icon,sort_order) VALUES ({q(slug)},{q(name)},{q(desc)},{q(icon)},{i});")
L.append("")
for i, (cat, slug, name, desc, d, edu, kind) in enumerate(T, 1):
    L.append(f"INSERT INTO tools (category_id,slug,name,description,kind,definition,educational_only,sort_order) VALUES "
             f"((SELECT id FROM categories WHERE slug={q(cat)}),{q(slug)},{q(name)},{q(desc)},{q(kind)},{j(d)},{q(edu)},{i});")
L.append("")
for i, (slug, cat, tl, name, expr, desc, expl, ex, feat, vars_) in enumerate(FORMULAS, 1):
    L.append(f"INSERT INTO formulas (category_id,tool_id,slug,name,expression,description,explanation,example,is_featured,sort_order) VALUES "
             f"((SELECT id FROM categories WHERE slug={q(cat)}),(SELECT id FROM tools WHERE slug={q(tl)} LIMIT 1),{q(slug)},{q(name)},{q(expr)},{q(desc)},{q(expl)},{q(ex)},{q(feat)},{i});")
    for k, (s, n, u, dsc) in enumerate(vars_):
        L.append(f"INSERT INTO formula_variables (formula_id,symbol,name,unit,description,sort_order) VALUES ((SELECT id FROM formulas WHERE slug={q(slug)}),{q(s)},{q(n)},{q(u)},{q(dsc)},{k});")
L.append("")
for slug, name, cat, desc, props, notes in MATERIALS:
    L.append(f"INSERT INTO materials (slug,name,category,description,properties,notes) VALUES ({q(slug)},{q(name)},{q(cat)},{q(desc)},{j(props)},{q(notes)});")
L.append("")
for (qty, lab, sym, name, f, off, base, so) in U:
    L.append(f"INSERT INTO units (quantity,quantity_label,symbol,name,factor,offset_value,is_base,sort_order) VALUES ({q(qty)},{q(lab)},{q(sym)},{q(name)},{q(float(f))},{q(float(off))},{q(base)},{so});")
L.append("")
L.append("INSERT INTO site_settings (key,value,description) VALUES ('app_version','\"1.0.0\"'::jsonb,'Versión visible en el pie de página');")
L.append("INSERT INTO site_settings (key,value,description) VALUES ('maintenance_message','\"\"'::jsonb,'Si no está vacío, se muestra como aviso global');")
L += ["", "COMMIT;", ""]
Path(__file__).with_name("seed.sql").write_text("\n".join(L), encoding="utf-8")
print(f"seed.sql generado: {len(CATEGORIES)} categorías, {len(T)} herramientas, {len(FORMULAS)} fórmulas, {len(MATERIALS)} materiales, {len(U)} unidades")
