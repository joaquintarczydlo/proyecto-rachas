<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Módulo de Desafíos

API en `/desafios` para crear, consultar, modificar y cancelar desafíos.
Un desafío tiene nombre (3 a 60 caracteres), descripción opcional (hasta 280),
una categoría (`SALUD`, `ESTUDIO`, `FINANZAS`, `BIENESTAR` u `OTRO`), fecha de
inicio, fecha de fin, un máximo de participantes (entre 2 y 20, por defecto 10)
y un código de invitación de 6 caracteres generado por el servidor que nunca se
repite (índice único en MongoDB, con reintento ante colisiones).

### ¿El estado se guarda o se calcula?

**Decisión: el estado se calcula** en cada lectura a partir de las fechas; solo
se persiste el flag `cancelado`.

| Estado | Origen |
| ------ | ------ |
| `PROGRAMADO`, `ACTIVO`, `FINALIZADO` | **Calculado**: comparación de `hoy` contra `fechaInicio` / `fechaFin` |
| `CANCELADO` | **Persistido**: campo booleano `cancelado` |

Regla de cálculo (`calcularEstadoDesafio` en `src/desafios/utils/desafio.utils.ts`,
expuesta como el virtual `estado` del schema):

- `cancelado === true` → `CANCELADO`
- `hoy < fechaInicio` → `PROGRAMADO`
- `fechaInicio <= hoy <= fechaFin` → `ACTIVO` (los extremos incluidos)
- `hoy > fechaFin` → `FINALIZADO`

**Justificación:**

1. `PROGRAMADO` / `ACTIVO` / `FINALIZADO` son una función pura de
   `fechaInicio`, `fechaFin` y el día de hoy. Si el estado se guardara en la
   colección, quedaría desactualizado con el paso de los días: haría falta un
   proceso programado (cron/job) que lo recalcule, y cualquier fallo dejaría
   estados "fantasma" (por ejemplo, un desafío guardado como `ACTIVO` que en
   realidad ya finalizó).
2. Al calcularlo en cada lectura, el estado que devuelve la API siempre
   coincide con las fechas, sin infraestructura adicional y sin riesgo de
   desincronización entre datos y estado.
3. `CANCELADO` es el único estado que no se deduce de las fechas: es una
   acción explícita del creador, por eso se persiste en el campo `cancelado`.
4. Las fechas son de calendario (`YYYY-MM-DD`, mismo criterio que Personas,
   sin horas ni UTC) y "hoy" se calcula en `America/Argentina/Buenos_Aires`,
   de modo que el cambio de estado ocurre exactamente el día correcto, sin
   problemas de desfases horarios.

Contra-partida asumida: no se puede hacer `find({ estado: 'ACTIVO' })` de forma
indexada. Si en el futuro se necesita consultar por estado masivamente, se puede
persistir el estado derivado y recalcularlo en cada escritura/lectura sin
cambiar la API.

### Reglas aplicadas

- La duración es de 3 a 90 días inclusive (se cuentan el día de inicio y el de
  fin) y la fecha de inicio no puede ser anterior a hoy.
- El código de invitación lo genera el servidor con 6 caracteres (alfabeto sin
  caracteres ambiguos) y es único.
- Quien lo crea (`creadorId`) queda como creador y como participante
  automáticamente; solo él puede modificarlo o cancelarlo (`403` en caso contrario).
- `nombre`, `descripcion` y `categoria`: editables mientras el estado no sea
  `FINALIZADO` ni `CANCELADO`.
- `fechaInicio`, `fechaFin` y `maxParticipantes`: editables **solo** mientras
  esté `PROGRAMADO`, y el máximo nunca puede quedar por debajo de la cantidad
  de participantes actuales.
- Se puede cancelar un desafío `PROGRAMADO` o `ACTIVO`.
- Uno `FINALIZADO` o `CANCELADO` solo admite consultas: cualquier otra
  operación responde `409`.

### Participación

- **Unirse** (`POST /desafios/unirse`) con el código de invitación: el desafío
  debe estar `PROGRAMADO` o `ACTIVO` y tener cupo. No se puede unir dos veces
  (`409`), y quien abandonó no puede volver a unirse (`409`).
- **Límite de desafíos vigentes**: una persona no puede tener más de 5
  desafíos `PROGRAMADO` o `ACTIVO` al mismo tiempo, **contando los que creó**
  (el creador figura en `participantes`).
- **Abandonar** (`POST /desafios/:id/abandonar`): la persona deja de figurar
  en `participantes` (y en el ranking) pero queda registrada en el historial
  `abandonados`, por lo que no puede volver a unirse. El creador no puede
  abandonar: debe cancelar el desafío (`403`).
- El historial se conserva en el campo `abandonados` del desafío, listo para
  cuando se implemente el ranking.

### Endpoints

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `POST` | `/desafios` | Crea un desafío y genera su código de invitación |
| `GET` | `/desafios?estado=&categoria=` | Lista los desafíos, filtrando por estado y/o categoría |
| `GET` | `/desafios/persona/:personaId` | Lista los desafíos en los que participa una persona |
| `GET` | `/desafios/codigo/:codigo` | Consulta un desafío por su código de invitación |
| `GET` | `/desafios/:id` | Consulta un desafío por id |
| `GET` | `/desafios/:id/participantes` | Consulta los participantes de un desafío |
| `POST` | `/desafios/unirse` | Une una persona al desafío de su código de invitación |
| `POST` | `/desafios/:id/abandonar` | Abandona un desafío (no el creador) |
| `PATCH` | `/desafios/:id` | Modifica un desafío (solo el creador) |
| `POST` | `/desafios/:id/cancelar` | Cancela un desafío (solo el creador) |

Nota: como el estado no se guarda, el filtro `?estado=` se traduce a
criterios de fechas en la consulta de MongoDB (`construirFiltroEstado`), del
mismo modo en que se calcula el estado en cada lectura.

### Check-ins

Un check-in registra que una persona cumplió su objetivo en un día de un
desafío: tiene una fecha, una nota opcional (hasta 140 caracteres) y un valor
numérico opcional (minutos, kilómetros, páginas…). Vive en su propia
colección (`check-ins`), con índice único sobre `{ desafio, persona, fecha }`
que garantiza la regla de un único check-in por persona, desafío y día.

Reglas:

- Solo los **participantes** (`403`) y solo en desafíos **ACTIVO** (`409`).
- La fecha por defecto es **hoy en la zona horaria de la persona** (no la del
  servidor); también se admite la de ayer, para quien se olvidó. Nunca una
  futura ni anterior a ayer (`400`), y siempre dentro del rango
  `[fechaInicio, fechaFin]` del desafío (`400`).
- **Deshacer** (`DELETE .../check-ins/ultimo`): únicamente el **último**
  check-in propio del desafío y solo si es de **hoy** (`404` si no tiene
  check-ins, `409` si el último es de ayer u otro día). A diferencia del
  registro, el deshacer no exige que el desafío siga ACTIVO: la única
  condición es "el último y de hoy" (decisión tomada siguiendo la letra del
  enunciado; queda documentada por si se quiere restringir más).
- El historial de check-ins de una persona en un desafío se puede listar
  ordenado por fecha.

Endpoints (anidados en el desafío):

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `POST` | `/desafios/:id/check-ins` | Registra un check-in (body: `personaId`, `fecha?`, `nota?`, `valor?`) |
| `GET` | `/desafios/:id/check-ins?personaId=` | Lista los check-ins de una persona en el desafío |
| `DELETE` | `/desafios/:id/check-ins/ultimo` | Deshace el último check-in propio (body: `personaId`) |

### Identidad del creador

El proyecto todavía no tiene módulo de autenticación, así que la identidad
viaja en el cuerpo (`creadorId`) tanto al crear como al modificar o cancelar.
Cuando exista un módulo de sesión/usuarios, `creadorId` se reemplaza por el
usuario autenticado sin cambiar las reglas de negocio.

Para probar el módulo contra un servidor levantado, ver `test-desafios.http`.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observer](https://observer.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
