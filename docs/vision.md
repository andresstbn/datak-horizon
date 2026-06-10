# Visión del Producto — Datak Horizon

## ¿Qué es Datak Horizon?

**Datak Horizon** NO es un gestor de proyectos tradicional (como Jira o Linear), ni un sistema wiki estático (como Confluence), ni únicamente una herramienta de visualización de hitos (como un Roadmap convencional).

Es una **plataforma de refinamiento colaborativo asistida por IA** diseñada para actuar como el puente dinámico entre las discusiones de negocio (donde nace el conocimiento y los requerimientos implícitos) y la ejecución técnica (el código resultante implementado por desarrolladores humanos o agentes de desarrollo basados en IA).

---

## El Flujo de Refinamiento Objetivo

El producto optimiza el trayecto desde una idea inicial en lenguaje natural hasta una implementación de software lista para producción a través de los siguientes pasos estructurados:

1. **Conversación**: El debate inicial se origina de forma manual, grabaciones de reuniones, transcripciones de voz o importaciones desde canales de comunicación activa (Slack, WhatsApp, etc.).
2. **Refinamiento**: Conversaciones dinámicas en forma de hilos de chat donde el equipo técnico y de negocio colaboran.
3. **Preguntas / Respuestas**: Maduración interactiva de las dudas mediante mensajes.
4. **Contexto Consolidado**: Unificación en un único documento de todo el conocimiento disperso en el hilo.
5. **Especificación Funcional**: Definición clara y sin ambigüedades del alcance.
6. **Plan Técnico**: Arquitectura, cambios sugeridos al esquema de base de datos e instrucciones técnicas.
7. **Prompt para Agente de Desarrollo**: Instrucciones sumamente estructuradas (prompts de contexto) que un LLM o agente de desarrollo autónomo puede interpretar sin cometer errores de alcance.
8. **Implementación**: Producción del código final de forma rápida y automatizada.

---

## La Filosofía "No-Jira"

A diferencia de un gestor de tickets:
- No pretendemos forzar el flujo de trabajo en estados de Kanban rígidos donde las conversaciones valiosas se pierden en el feed de comentarios de un ticket cerrado.
- En Horizon, **el conocimiento sobrevive a la conversación**. Las decisiones tomadas, restricciones descubiertas y reglas de negocio se capturan explícitamente en el modelo en forma de **Insights** y **Requerimientos**.
- Los artefactos técnicos resultantes no son especificaciones estáticas obsoletas, sino documentos vivos exportables como Markdown con un clic para alimentar agentes autónomos de IA.

---

## Próximos Pasos en la Visión (Soporte IA)
En fases futuras, Horizon incorporará:
- **Extracción Automática de Insights**: Detección de supuestos, restricciones y reglas usando modelos de lenguaje (LLM) en tiempo real al enviar mensajes en un hilo.
- **Generación Automatizada de Artefactos**: Creación de borradores de especificaciones técnicas y planes a partir del contexto consolidado usando agentes locales.
- **Soporte Multimedial Completo**: Procesamiento directo de audio (para reuniones) y documentos PDF/imágenes de UI para incorporarlos al flujo de refinamiento.

---

## Más información
- [Características del MVP](file:///Users/daniel/Datak/datak-services/datak-horizon/docs/mvp-features.md)
- [Guía de Base de Datos y Operación Local](file:///Users/daniel/Datak/datak-services/datak-horizon/docs/database-guide.md)
