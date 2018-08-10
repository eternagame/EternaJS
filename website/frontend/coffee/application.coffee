@Application = {
	
  initialize : () ->

    if @on_initialize
      @on_initialize();
    @setup_google_analytics()
    @setup_google_web_font()
    url = window.location.toString()
    uri = Utils.to_uri(url)
        
    $(() ->
      Page.transit(uri, false)
    )
    
#  setup_google_analytics : () ->
#    if @GOOGLE_ANALYTICS_ID 
#      src =  (if 'https:' == document.location.protocol then 'https://ssl' else 'http://www') + '.google-analytics.com/ga.js';
#      $.getScript(src, (data, textStatus) ->      
#        try 
#          pageTracker = _gat._getTracker(Application.GOOGLE_ANALYTICS_ID)
#          pageTracker._trackPageview()
#               
#      )
      
#  setup_google_web_font : () ->
#    if window.WebFontConfig
#      wf = document.createElement("script")
#      wf.src = (if "https:" is document.location.protocol then "https" else "http") +  "://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js"
#      wf.type = "text/javascript"
#      wf.async = "true"
#      s = document.getElementsByTagName("script")[0]
#      s.parentNode.insertBefore wf, s

  initialize_google_analytics : (gid, custom_variables) ->
    @google_analytics_id_ = gid
    @google_analytics_variables_ = custom_variables
    
  setup_google_analytics : () ->
    if @google_analytics_id_
      src =  (if 'https:' == document.location.protocol then 'https://ssl' else 'http://www') + '.google-analytics.com/u/ga_debug.js';
      $.getScript(src, (data, textStatus) =>
        try 
          @page_tracker_ = pageTracker = _gat._createTracker(Application.google_analytics_id_)
          if @google_analytics_variables_?
            for own key,val of @google_analytics_variables_
              pageTracker._setCustomVar( val.index, key, val.val, val.scope)
          pageTracker._trackPageview()
          
      )
      
  setup_google_web_font : () ->
    if window.WebFontConfig
      wf = document.createElement("script")
      wf.src = (if "https:" is document.location.protocol then "https" else "http") +  "://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js"
      wf.type = "text/javascript"
      wf.async = "true"
      s = document.getElementsByTagName("script")[0]
      s.parentNode.insertBefore wf, s


  get_application_parameter : (key) ->
    return @application_parameters_[key]
    
  get_application_parameters : () ->
    return @application_parameters_

  track_google_analytics_event : (category, action, label) ->
    if @page_tracker_?
      @page_tracker_._trackEvent(category, action, label)
}