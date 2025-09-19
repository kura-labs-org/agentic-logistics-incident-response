(function (inputs) {
  // Configuration - Set webhook URL here
  var WEBHOOK_URL = 'REPLACE_WITH_YOUR_N8N_WEBHOOK_URL';

  try {
    var routeId = inputs.route_id;
    if (!routeId) {
      return {
        success: 'false',
        message: 'Route ID is required',
        route_id: 'not_provided',
      };
    }

    // Get the delivery delay record to include additional context
    var delayGr = new GlideRecord('x_snc_pepsico_de_0_delivery_delay');
    delayGr.addQuery('route_id', routeId);
    delayGr.query();

    if (!delayGr.next()) {
      return {
        success: 'false',
        message: 'Delivery delay record not found for route: ' + routeId,
        route_id: routeId,
      };
    }

    var delaySysId = delayGr.getUniqueValue();
    var truckId = delayGr.getValue('truck_id');
    var chosenOptionJson = delayGr.getValue('chosen_option');

    gs.info('N8N Webhook: Found delivery delay record, sys_id=' + delaySysId);

    // Parse chosen_option JSON if it's stored as string
    var chosenOption;
    try {
      chosenOption =
        typeof chosenOptionJson === 'string'
          ? JSON.parse(chosenOptionJson)
          : chosenOptionJson;
    } catch (e) {
      return {
        success: 'false',
        message: 'Failed to parse chosen_option JSON: ' + e.message,
        route_id: routeId,
      };
    }

    // Prepare webhook payload matching your expected format
    var webhookPayload = {
      route_id: routeId,
      truck_id: truckId,
      chosen_option: chosenOption,
    };

    // Make API call to N8N webhook
    var request = new sn_ws.RESTMessageV2();
    request.setEndpoint(WEBHOOK_URL);
    request.setHttpMethod('POST');
    request.setRequestHeader('Content-Type', 'application/json');
    request.setRequestHeader('Accept', 'application/json');

    var requestBody = JSON.stringify(webhookPayload);
    request.setRequestBody(requestBody);

    var startTime = new Date().getTime();
    var response = request.execute();
    var endTime = new Date().getTime();
    var responseTime = endTime - startTime;

    var httpStatusCode = response.getStatusCode();
    var responseBody = response.getBody();
    var errorMessage = response.getErrorMessage();
    var isSuccess = httpStatusCode >= 200 && httpStatusCode < 300;

    gs.info(
      'N8N Webhook: API Response - Status: ' +
        httpStatusCode +
        ', Body: ' +
        responseBody
    );

    return {
      success: isSuccess.toString(),
      message: isSuccess
        ? 'N8N workflow triggered successfully! Route ' +
          routeId +
          ' execution initiated. Response time: ' +
          responseTime +
          'ms'
        : 'Webhook failed - HTTP ' +
          httpStatusCode +
          ': ' +
          (errorMessage || responseBody),
      route_id: routeId,
      truck_id: truckId,
      chosen_option: JSON.stringify(chosenOption),
      http_status: httpStatusCode.toString(),
      response_time_ms: responseTime.toString(),
      webhook_url: WEBHOOK_URL,
    };
  } catch (e) {
    var errorMsg = 'Exception in N8N webhook call: ' + e.message;
    gs.error('N8N Webhook error: ' + errorMsg);

    return {
      success: 'false',
      message: errorMsg,
      route_id: inputs.route_id || 'unknown',
      webhook_url: WEBHOOK_URL,
    };
  }
})(inputs);
