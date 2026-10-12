# Cómo agregar contenido (sin tocar el frontend)

Entra a `#/admin` con tu cuenta ADMIN. Cada sección permite **Crear, Editar, Eliminar, Buscar y Filtrar**.

## Nueva categoría
Administración → Categorías → Nuevo. Campos: *slug* (minúsculas y guiones, será parte de la URL), nombre, descripción, icono (`shapes, compass, cube, droplet, building, list, swap, calc, ruler, formula, flask…`) y orden. Aparece sola en el menú y el dashboard.

## Nueva herramienta de cálculo
Administración → Herramientas → Nuevo. Elige categoría, slug, nombre y tipo **calculator**. En *Definición (JSON)* usa el botón **Insertar plantilla** y modifícala:

```json
{
  "inputs": [
    { "key": "b", "label": "Base", "units": [["m", 1], ["cm", 0.01]], "default": 1, "positive": true },
    { "key": "h", "label": "Altura", "units": [["m", 1], ["cm", 0.01]], "positive": true }
  ],
  "outputs": [
    { "key": "A", "label": "Área", "expr": "b*h", "unit": "m²", "decimals": 4, "formula": "A = b · h" }
  ],
  "invalid_message": "Texto opcional si los datos no dan un resultado válido."
}
```

**Inputs:** `key` (identificador: letras, números y `_`), `label`, opcional `units` (`[símbolo, factor a la unidad base]`; la primera es la base), `unit` (unidad fija, sin selector), `default`, `positive` (>0), `nonnegative` (≥0), `hint`.

**Outputs:** `expr` usa las `key` de los inputs (ya convertidas a la unidad base). Operadores `+ - * / ^ %`, paréntesis, constantes `pi e`, y funciones `sin cos tan asin acos atan atan2 sqrt cbrt abs exp ln log log2 floor ceil round min max mod rad deg pow`. Las funciones trigonométricas trabajan en **radianes**; usa `rad(x)` si x está en grados y `deg(...)` para devolver grados. Los argumentos se separan con coma.

Marca *Solo referencial / educativa* para mostrar el aviso de uso profesional (Estructuras).

Otros tipos: `converter` (conversor) y `scientific` (calculadora) tienen interfaz propia.

## Nueva fórmula
Fórmulas → Nuevo (categoría, nombre, texto de la fórmula, descripción, explicación, ejemplo, herramienta relacionada). Luego Variables → Nuevo para cada símbolo (fórmula, símbolo, nombre, unidad).

## Nuevas unidades
Unidades → Nuevo. `valor_base = valor × factor + desfase`. Ejemplo: `km` en longitud → factor 1000, desfase 0. Para una magnitud nueva usa una *clave* nueva (p. ej. `energia`) y repite su nombre visible en todas sus unidades; marca una como base.

## Nuevo material
Materiales → Nuevo. *Propiedades* es un JSON de pares: `{"Densidad": "2400 kg/m³"}`.

## Cambios masivos con SQL
También puedes insertar directamente en pgAdmin. Regenerar los datos de demostración: edita `database/generate_seed.py` y ejecuta `python generate_seed.py`.
