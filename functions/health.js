const { getProviderStatus, ZERO_SPEND_MODE } = require('./quota-manager');

module.exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      status: 'ok',
      zeroSpendMode: ZERO_SPEND_MODE,
      providers: getProviderStatus(),
      timestamp: new Date().toISOString(),
    }),
  };
};
