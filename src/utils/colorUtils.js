/**
 * Determina si un color hexadecimal es "claro" u "oscuro".
 * Devuelve true si es claro, false si es oscuro.
 * @param {string} color - El color en formato hexadecimal (p. ej., "#RRGGBB" o "#RGB").
 * @returns {boolean}
 */
export function isColorLight(color) {
  if (!color || typeof color !== 'string') {
    return true; // Default para colores inválidos
  }

  let r, g, b;

  // Manejar formato #RGB
  if (color.length === 4) {
    r = parseInt(color[1] + color[1], 16);
    g = parseInt(color[2] + color[2], 16);
    b = parseInt(color[3] + color[3], 16);
  }
  // Manejar formato #RRGGBB
  else if (color.length === 7) {
    r = parseInt(color.slice(1, 3), 16);
    g = parseInt(color.slice(3, 5), 16);
    b = parseInt(color.slice(5, 7), 16);
  }
  // Manejar otros formatos (como 'blue', 'rgba(...)', etc.) de forma simple
  else {
    // Para nombres de colores o formatos no hex, no podemos calcular la luminosidad fácilmente.
    // Podríamos tener un mapa, pero por simplicidad, devolvemos un valor por defecto.
    // Asumimos que los colores no-hex son probablemente oscuros si no podemos analizarlos.
    if (color.includes('rgb')) {
        try {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                r = parseInt(match[1], 10);
                g = parseInt(match[2], 10);
                b = parseInt(match[3], 10);
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
    } else {
        return false; // Asumir oscuro para nombres de color, etc.
    }
  }

  // Fórmula de luminosidad (YIQ)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

  // Umbral: 128 es un punto medio común.
  return yiq >= 128;
}
