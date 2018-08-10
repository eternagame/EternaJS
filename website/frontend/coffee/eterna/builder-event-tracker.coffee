class @BuilderEventTracker extends Builder

  on_build: (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)

    user_data = Application.CURRENT_USER
    if !(user_data?)
      return

    if user_data['Survey'].indexOf("EULA_Agree") < 0
      return

    params['user_events'] = Application.CURRENT_USER['User_Events']
    
    event_params = params
    @build_user_events(event_params)


  get_scheduled_events : () ->
    # eventually, store events in json file, or even the db
    events = [
      {'name':'Press_Corps_Event_1', 'nid':6915472, 'type': 'press'},
      {'name':'User_Event_Pre_Lab_Open_TB_1', 'nid':6895422, 'type':'pre_lab'}
      {'name':'User_Event_Open_TB_1', 'nid':6895412, 'type': 'lab_member'}
    ]
    return events


  get_scheduled_events_for_lab : () ->
    # eventually, store events in json file, or even the db
    events = [
      {'name':'User_Event_Open_TB_2', 'nid':6903306, 'type':'lab_nid:6892349'}
    ]
    return events


  build_user_events : (event_params, index = 0) ->
    if event_params['lab_nid']?
      events = @get_scheduled_events_for_lab()
    else
      events = @get_scheduled_events()
    if index >= events.length
      return false
    event = events[index]
    event_params['event_index'] = index
    event_params['event_type'] = event['type']
    event_params['event_name'] = event['name']
    event_params['event_nid'] = event['nid'] 
    if @check_user_event(event_params) == true
      @display_user_event(event_params)
    else
      @build_user_events(event_params, ++index)


  wait_for_element_ : (element) ->
    element = "news-block"
    block = document.getElementById(element)
    if document.body.contains(block) 
      #$("#"+element).fadeIn("fast")
      $("#event-block").show()
    else
      setTimeout(@wait_for_element_, 10)
    
  display_user_event : (event_params) ->
    canvas = fireworksStart(8)       
    index = event_params['event_index']
    block = Blocks("event-block")
    $overlay_slot = Overlay.get_slot("scheduled-event-box-"+index);
    Overlay.load_overlay_content("scheduled-event-box-"+index);
    Overlay.show()
    builder = block.add_block($overlay_slot, event_params);
    $(".event-block").css({
      'top':'75px',
      'z-index':9999 
    })
 
    #setTimeout(@wait_for_element_, 10)

    if $continue_button = $('a#close-event')    
      #$continue_button.show()
      this2 = this
      $continue_button.click(event_params, () =>
        BuilderEventTracker.prototype.user_event_clicked(event_params)
        this2.build_user_events(event_params, ++index)
      )


  check_user_event : (event_params) ->
    user_events = event_params['user_events']

    if event_params['event_type'] == 'pre_lab'
      if Application.GLOBAL_THEME_PARAMETERS['is_lab_member'] == true
        return false

    if event_params['event_type'] == 'press'
      if Application.GLOBAL_THEME_PARAMETERS['is_press_corps'] != true
        return false
      if Application.GLOBAL_THEME_PARAMETERS['is_lab_member'] != true
        return false

    if event_params['event_type'] == 'lab_member'
      if Application.GLOBAL_THEME_PARAMETERS['is_lab_member'] != true
        return false

    if event_params['event_type'].indexOf('lab_nid') >= 0
      if Application.GLOBAL_THEME_PARAMETERS['is_lab_member'] != true
        return false
      if !(event_params['nid']?)      
        return false
      if event_params['event_type'].indexOf('lab_nid:'+event_params['lab_nid']) < 0       
        return false
      

    if !(user_events?)
      return true
    if user_events.indexOf(event_params['event_name']) < 0
      return true
    if event_params['repeat_event']?
      if event_params['repeat_event'] == event_params['event_name']
        return true
      if event_params['repeat_event'] == "all"
        return true
    return false


  user_event_clicked : (event_params) ->
    event_name = event_params['event_name']
    if event_name == "{event_name}"
      alert("invalid event_name (event_name="+event_name+")")
      Overlay.hide()
      return
    if $("#continue_button").prop("disabled") == true
      alert("continue button disabled (event_name="+event_name+")")
      return   
    Me.update_user_events(Application.CURRENT_USER['uid'], event_name, (data) =>
    )
    $("a#close-event").fadeOut(0)
    Overlay.hide()
