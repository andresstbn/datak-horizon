# Características del MVP — Datak Horizon

Esta sección detalla las funcionalidades implementadas en el primer núcleo funcional (MVP) de la plataforma, detallando el modelo y la interacción del usuario.

---

## Funcionalidades del Core

### 1. Gestión de Iniciativas (`Initiatives`)
Representan esfuerzos de negocio visibles de mediano/largo plazo.
- Permite crear iniciativas ingresando un título y descripción de alcance general.
- Cada iniciativa posee un estado de refinamiento, prioridad, nivel de riesgo y nivel de salud (`health`).
- Se vinculan propietarios funcionales (`functionalOwnerId`) y técnicos (`technicalOwnerId`).

### 2. Roadmap Ejecutivo
Una vista consolidada para la alta dirección.
- Se presenta una tabla dinámica que muestra de forma resumida el estado, salud, prioridad, riesgo y dueños de cada iniciativa.
- Soporta filtros avanzados de búsqueda y paginación rápida para rastrear esfuerzos específicos sin saturar la vista.

### 3. Hilos de Conversación (`Conversations`)
El lugar inicial donde nace el conocimiento de producto.
- Permite crear múltiples hilos de discusión asociados a una única iniciativa.
- Clasificación según el origen (`source`) de la discusión: creación manual en la UI, importación de canales activos (Slack, WhatsApp), notas de voz o minutas de reunión.

### 4. Mensajería con Markdown (`ConversationMessage`)
- Experiencia interactiva tipo chat en la interfaz del usuario.
- Soporte completo para renderizado de texto enriquecido en Markdown (títulos, negrita, listas, etc.).
- Diseñado estructuralmente para soportar transcripciones de audio y referencias multimedia en fases futuras.

### 5. Registro de Insights y Reglas (`Insights`)
Conocimiento refinado de negocio extraído del chat para evitar que se pierda en el historial.
- Permite registrar restricciones, dependencias técnicas, decisiones críticas, supuestos y riesgos.
- Los insights se pueden vincular directamente al hilo de conversación del que proceden.
- Cada insight posee un nivel de confianza (score de 0.0 a 1.0) preparado para inferencias de IA.

### 6. Gestión de Requerimientos Técnicos (`Requirements`)
La traducción de la conversación en hitos funcionales concretos de desarrollo.
- Permite registrar requerimientos refinados asociados a un hilo de conversación de origen.
- Clasificación de prioridad utilizando el framework MoSCoW (`must`, `should`, `could`, `wont`).
- Control de estados independientes (`draft`, `refining`, `ready`, `implemented`, `archived`) para conocer la madurez de cada requerimiento.

### 7. Generación Manual de Artefactos de IA (`AIArtifacts`)
Estructuración de documentos de diseño listos para desarrollo.
- Permite redactar directamente plantillas de Markdown para:
  - Preguntas de Refinamiento
  - Especificaciones Funcionales
  - Planes Técnicos
  - Prompts de Desarrollo
  - Listas de Control QA (Checklists)
- Los artefactos se vinculan opcionalmente a un requerimiento específico o conversación para trazar su origen.

### 8. Exportación de Contexto Consolidado (Copiar Contexto)
La característica fundamental de interoperabilidad.
- En la esquina superior derecha del detalle de cada iniciativa se encuentra el botón **Copiar Contexto**.
- Esta funcionalidad ejecuta una consulta recursiva en el backend (`consolidatedContextService.ts`) que recopila toda la metadata de la iniciativa, los mensajes de todas las conversaciones asociadas, los insights registrados, los requerimientos y los artefactos.
- Todo esto se compila en un único documento de Markdown limpio y estructurado y se copia automáticamente al portapapeles del usuario, optimizado para ser pegado directamente en la ventana de contexto de herramientas de IA (Claude, Gemini, etc.).

---

## Enlaces útiles
- [Visión del Producto](file:///Users/daniel/Datak/datak-services/datak-horizon/docs/vision.md)
- [Guía de Base de Datos y Operación Local](file:///Users/daniel/Datak/datak-services/datak-horizon/docs/database-guide.md)
