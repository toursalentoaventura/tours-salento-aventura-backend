const ZONA_HORARIA_NEGOCIO = 'America/Bogota';
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

const obtenerFechaHoraActualBogota = (ahora = new Date()) => {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_HORARIA_NEGOCIO,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(ahora).filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value])
  );

  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    hora: `${partes.hour}:${partes.minute}:${partes.second}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute)
  };
};

const normalizarFecha = (fecha) => {
  if (typeof fecha !== 'string' || !FORMATO_FECHA.test(fecha)) return null;
  const [year, month, day] = fecha.split('-').map(Number);
  const prueba = new Date(Date.UTC(year, month - 1, day));
  return prueba.getUTCFullYear() === year && prueba.getUTCMonth() === month - 1 &&
    prueba.getUTCDate() === day ? fecha : null;
};

const convertirHoraAMinutos = (hora) => {
  const coincidencia = String(hora || '').trim().match(FORMATO_HORA);
  if (!coincidencia) return null;
  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);
  const segundos = Number(coincidencia[3] || 0);
  if (horas > 23 || minutos > 59 || segundos > 59) return null;
  return horas * 60 + minutos + segundos / 60;
};

const normalizarHora = (hora) => {
  const coincidencia = String(hora || '').trim().match(FORMATO_HORA);
  if (!coincidencia || convertirHoraAMinutos(hora) === null) return null;
  return `${String(Number(coincidencia[1])).padStart(2, '0')}:${coincidencia[2]}:${String(Number(coincidencia[3] || 0)).padStart(2, '0')}`;
};

const normalizarHorariosTour = (horarios = []) => {
  const normalizados = horarios.map((horario) => {
    const horaInicio = normalizarHora(horario?.hora_inicio || horario?.hora);
    if (!horaInicio) throw Object.assign(new Error('Uno de los horarios no tiene un formato válido.'), { statusCode: 422 });
    return { ...horario, hora_inicio: horaInicio, activo: horario.activo !== false };
  });
  if (new Set(normalizados.map(({ hora_inicio }) => hora_inicio)).size !== normalizados.length) {
    throw Object.assign(new Error('No se permiten horarios duplicados dentro del mismo tour.'), { statusCode: 422 });
  }
  return normalizados.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
};

const fechaDentroDeRango = (fecha, rango) => Boolean(
  fecha && rango?.fecha_inicio && rango?.fecha_fin &&
  rango.fecha_inicio <= fecha && fecha <= rango.fecha_fin
);

const validarRangosNoDisponibles = (rangos = [], ahora = new Date()) => {
  const hoy = obtenerFechaHoraActualBogota(ahora).fecha;
  for (const rango of rangos) {
    const inicio = normalizarFecha(rango?.fecha_inicio);
    const fin = normalizarFecha(rango?.fecha_fin);
    if (!inicio || !fin) throw Object.assign(new Error('La fecha inicial y la fecha final son obligatorias y deben tener formato YYYY-MM-DD.'), { statusCode: 422 });
    if (inicio < hoy || fin < hoy) throw Object.assign(new Error('Los rangos no disponibles no pueden comenzar ni terminar en el pasado.'), { statusCode: 422 });
    if (fin < inicio) throw Object.assign(new Error('La fecha final debe ser igual o posterior a la fecha inicial.'), { statusCode: 422 });
  }
  return true;
};

const validarDisponibilidadTemporal = ({ fechaReserva, horaInicio, rangos = [], ahora = new Date() }) => {
  const fecha = normalizarFecha(fechaReserva);
  if (!fecha) throw Object.assign(new Error('La fecha de reserva debe tener formato YYYY-MM-DD.'), { statusCode: 422 });
  const actual = obtenerFechaHoraActualBogota(ahora);
  if (fecha < actual.fecha) throw Object.assign(new Error('No se pueden crear reservas para fechas anteriores.'), { statusCode: 422 });
  if (rangos.some((rango) => fechaDentroDeRango(fecha, rango))) throw Object.assign(new Error('La fecha seleccionada no está disponible para este tour.'), { statusCode: 422 });
  const minutosHorario = convertirHoraAMinutos(horaInicio);
  if (minutosHorario === null) throw Object.assign(new Error('El horario seleccionado no es válido.'), { statusCode: 422 });
  if (fecha === actual.fecha && minutosHorario <= actual.minutos) throw Object.assign(new Error('El horario seleccionado ya pasó.'), { statusCode: 422 });
  return true;
};

module.exports = { ZONA_HORARIA_NEGOCIO, obtenerFechaHoraActualBogota, normalizarFecha, normalizarHora, normalizarHorariosTour, convertirHoraAMinutos, fechaDentroDeRango, validarRangosNoDisponibles, validarDisponibilidadTemporal };
