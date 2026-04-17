Necesito:

- Reversar pagos con payphone si se cancela la reserva:
Consideraciones
Es crucial tener en cuenta la siguiente restricción temporal para los reversos de transacciones:
Los reversos solo pueden ejecutarse el mismo día de la transacción original.
El período de reversión está limitado hasta las 20:00 del día en que se realizó la transacción.

url: https://pay.payphonetodoesposible.com/api/Reverse

cuerpo:

{
  "id": 33107661  // ID de la transacción payphone
}

cabeceras:

Authorization: bearer TU_TOKEN (Token de autenticación de la aplicación, precedido por la palabra "Bearer". Este token es el mismo que utilizaste al preparar la transacción inicialmente).
Content-type: application/json (Formato de los datos: JSON).

Response:

success: true
error: {
    "message": "La transacción no existe, verifique que el identificador enviado sea correcto.",
    "errorCode": 20
}

esto debemos integrar pero con ciertas validaciones, tal cual como dice arriba son consideraciones de payphone, nosotros validar y mostrar un toast de error si no es posible, pero, como validacioens de nosotros, debemos de, si una reserva ya esta completada, no permitir ni cambiar de estado, ni reversar.