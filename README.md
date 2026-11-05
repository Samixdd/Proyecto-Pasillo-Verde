# Pasillo Verde

**La seguridad de la bodega no se aprende en un salón. Se aprende en el pasillo.**

Prototipo para el Reto Final de IA Generativa (Nodo EAFIT). App web para celular pensada para **auxiliares de bodega y montacarguistas** (≈180 personas, turnos de día y de noche), que lleva las pautas de seguridad de la Empresa al lugar y al momento en que se necesitan.

🔗 **App:** https://samixdd.github.io/pasillo-verde/

## Qué hace
| Propósito del reto | Cómo lo cumple |
|---|---|
| Reforzar breve y frecuente | Reto diario de 60 s (3 preguntas) con repetición espaciada |
| Consultar en el momento | QR pegado en cada zona → ficha con pictograma, audio y texto oficial · "¿Qué hago si…?" |
| Simular escenarios de riesgo | Simulador "elige tu camino" basado en los incidentes del último año |
| Verificar la comprensión | Pregunta de confianza: detecta a quien falla *estando seguro* |
| Información para la Empresa | Vista Empresa: comprensión por pauta y turno, mapa de calor, barreras, alertas |

## Cómo está construida
- **Front:** un solo `index.html` (HTML, CSS y JavaScript), publicado en GitHub Pages. Funciona sin conexión gracias a `sw.js`.
- **Datos:** Google Sheets + Apps Script (`doPost` guarda, `doGet` entrega resultados agregados).
- **Automatización:** disparadores de Apps Script → alerta por correo al líder del turno cuando un tema baja del 60 % (con la charla de 5 minutos) y resumen semanal.
- **IA generativa:** usada *detrás*, para generar preguntas, escenarios y charlas. Todo se verificó contra el texto oficial de las pautas (P-01 a P-13). En el momento de uso no hay IA respondiendo en vivo.

## Privacidad
No se piden nombres ni datos personales. Solo se registra turno, área y la acción. Los resultados se muestran por turno, nunca por persona.

## Qué es simulado
Los datos de la pestaña "Piloto simulado", el plano de la bodega (ilustrativo) y el envío del reto a cada colaborador. La lista completa está en la app, en "Qué funciona y qué está simulado".
