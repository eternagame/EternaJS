@AjaxManager = {

  xdm_xhrs_: new Object()

  query : (method,url,parameters,success_cb, failure_cb) ->
    
    if !(parameters?)
      parameters = new Object()
    parameters['rnd'] = Math.random()
    
    manager = @
      
    if method != "GET"

      parameter_string = Utils.generate_parameter_string(parameters,true);

      jQuery.ajax({
        type: method,
        url : url,
        data : parameter_string,
        success: (data) ->
          if success_cb?
            success_cb(Utils.json_to_object(data))
        ,
        error : (xhr,err) ->
          if failure_cb?
            failure_cb(xhr.status,xhr.responseText)
          else
            Utils.display_debug_message("AJAX request to " + url + " failed")
          return;
      })
    else
      
      parameter_string = Utils.generate_parameter_string(parameters,true)
      url += "?" + parameter_string

      jQuery.ajax({
        type : method,
        url : url,
        headers: { 
          Accept : "application/json"
        },
        success: (data) ->
          if success_cb?
            success_cb(Utils.json_to_object(data))
        ,
        error : (xhr,err) ->
          if failure_cb?
            failure_cb(xhr.status, xhr.responseText)
          else
            Utils.display_debug_message("AJAX request to " + url + " failed " + xhr.responseText + " " + err + " " + xhr.status + " " + xhr) 
      })

  remote_query : (remote_xdmpath, method,url,parameters,success_cb, failure_cb) ->
    
    if Utils.equals_null(parameters)
      parameters = new Object()
     
    xhrs = @xdm_xhrs_
    
    xhr = xhrs[remote_xdmpath]
    if Utils.equals_null(xhr)
      xhr = new easyXDM.Rpc({
        swf: remote_xdmpath + "/easyxdm.swf",
        remote: remote_xdmpath + "/cors/",
        remoteHelper: remote_xdmpath + "/name.html"
      }, {
        remote: {
          request: {}
        }
      });
      xhrs[remote_xdmpath] = xhr  
  
    if method == "GET"

      parameters['randomize'] = Math.random()
      parameter_string = Utils.generate_parameter_string(parameters,true)
      url += "?" + parameter_string

      xhr.request({
        url: url,
        headers: { 
          Accept : "application/json"
        },
        method: method
      },
      (rpcdata) =>
        if success_cb
          success_cb(Utils.json_to_object(rpcdata.data))
      )
    else
      Utils.display_error("remote query method " + method + " not implemented yet")
      return

  query_json : (url, success_cb, failure_cb) ->
    $.jsonp({
      'url': url
      , 'success': success_cb
      ,  'error' : failure_cb
    })
    
  querySync : (method, url, parameters) ->
    if !(parameters?)
      parameters = new Object()
    parameter_string = Utils.generate_parameter_string(parameters,true)
    
    data = $.ajax({
      url :url,
      async:false,
      type: method,
      data :parameter_string,
      dataType:"json"
    })    
    if data['responseText']?
      data = JSON.parse data['responseText']
    return data 
}
