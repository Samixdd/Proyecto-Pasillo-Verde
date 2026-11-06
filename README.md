# Pasillo Verde

**La seguridad de la bodega no se aprende en un salón. Se aprende en el pasillo.**

Prototipo para el Reto Final de IA Generativa (Nodo, Universidad EAFIT). App web para celular pensada para **auxiliares de bodega y montacarguistas** de la Empresa (≈180 personas, turnos de día y de noche). Lleva cada pauta de seguridad al lugar y al momento en que se necesita, y le muestra a la Empresa por qué no se cumple.

🔗 **App:** https://samixdd.github.io/pasillo-verde/

## Qué hace

| Propósito del reto | Cómo lo cumple |
|---|---|
| Reforzar breve y frecuente | Reto diario de 60 s: 3 preguntas de un banco de 17, con repetición espaciada |
| Consultar en el momento | QR pegado en 6 zonas de la bodega → ficha con pictograma, audio y texto oficial · "¿Qué hago si…?" |
| Simular escenarios de riesgo | Simulador "elige tu camino" con 3 casos basados en los incidentes del último año |
| Verificar la comprensión | Pregunta de confianza: detecta a quien falla *estando seguro* |
| Información para la Empresa | Vista Empresa: comprensión por pauta y turno, mapa de calor, barreras atendidas, alertas y charla de 5 minutos |

## Archivos del repositorio

| Archivo | Qué es |
|---|---|
| `index.html` | La app completa (HTML, CSS y JavaScript en un solo archivo) |
| `sw.js` | Permite abrir la app sin señal y enviar los datos cuando vuelve |
| `manifest.webmanifest` + íconos | Permiten instalarla en la pantalla de inicio del celular |
| `apps-script/Codigo.gs` | Backend en Google Sheets + Apps Script: guarda los datos, envía alertas al líder del turno y un resumen semanal |
| `afiches/Pasillo_Verde_Afiches_QR.pdf` | Afiches imprimibles con el QR de cada zona |

## Cómo está construida

- **App:** un solo `index.html`, publicado gratis en GitHub Pages. Funciona sin conexión gracias a `sw.js`.
- **Datos:** Google Sheets + Apps Script (`doPost` guarda los eventos; `doGet` entrega resultados agregados).
- **Automatización:** disparadores de Apps Script → alerta por correo al líder del turno cuando un tema baja del 60 % (con la charla de 5 minutos) y resumen semanal los lunes.
- **IA generativa:** Claude y Gemini, usados *detrás* para generar y verificar preguntas, escenarios y charlas. Todo se revisó contra el texto oficial de las pautas (P-01 a P-13). En el momento de uso no hay IA respondiendo en vivo: una norma de seguridad no puede salir "parecida".

## Privacidad

No se piden nombres ni datos personales. Solo se registra turno, área y la acción. Los resultados se muestran por turno, nunca por persona.

## Qué es simulado

Los datos de la pestaña "Piloto simulado", el plano de la bodega (ilustrativo) y el envío del reto a cada colaborador. La lista completa está en la app, en "Qué funciona y qué está simulado".
