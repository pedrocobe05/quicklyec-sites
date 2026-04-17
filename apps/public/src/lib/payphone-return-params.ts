/**
 * Tras el pago, Payphone redirige con `id` (transacción Payphone) y `clientTransactionId` (tu id de comercio).
 * Esos valores deben enviarse al Confirm como JSON `{ id, clientTxId }` donde `clientTxId` = valor de `clientTransactionId` en la URL.
 * @see https://docs.payphone.app/cajita-de-pagos-payphone#sect4
 */
export function readPayphoneReturnQuery(searchParams: URLSearchParams) {
  const read = (keys: string[]) => {
    for (const key of keys) {
      const raw = searchParams.get(key) ?? searchParams.get(key.toLowerCase());
      if (raw != null && String(raw).trim() !== '') {
        try {
          return decodeURIComponent(String(raw).trim());
        } catch {
          return String(raw).trim();
        }
      }
    }
    return '';
  };

  const idRaw = read(['id', 'transactionId', 'paymentId', 'transaction_id']);
  const clientTxRaw = read(['clientTransactionId', 'clientTxId', 'client_transaction_id']);

  return { id: idRaw, clientTransactionId: clientTxRaw };
}
