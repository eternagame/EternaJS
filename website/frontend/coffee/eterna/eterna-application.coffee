Application.GET_URI = "/get/"
Application.POST_URI = "/post/"

Application.DEFAULT_USER_PICTURE = "https://s3.amazonaws.com/eterna/icon_img/question.png"
Application.SCRIPT_URI = "http://ec2-54-242-61-159.compute-1.amazonaws.com:3000"

Application.on_initialize = () ->

  @GLOBAL_THEME_PARAMETERS = new Object()
  # If user data is rendered in DataManager, we are logged in
  user_prerender = DataManager.get_from_stash('user')
  if user_prerender
    @CURRENT_USER = user_prerender
    @GLOBAL_THEME_PARAMETERS['logged_in'] = true
    @GLOBAL_THEME_PARAMETERS['current_uid'] = user_prerender['uid']
    @GLOBAL_THEME_PARAMETERS['current_user'] = user_prerender['name']
    @GLOBAL_THEME_PARAMETERS['is_new'] = Page.is_there_new_notification()
    @GLOBAL_THEME_PARAMETERS['noti_count'] = parseInt(Page.count_new_notifications())
    @GLOBAL_THEME_PARAMETERS['is_lab_member_legacy'] = parseInt(user_prerender['is_lab_member_legacy']) > 0
    @GLOBAL_THEME_PARAMETERS['is_lab_member'] = parseInt(user_prerender['ten_tools_level']) >= 10
    # check for become a lab memeber badge here !!!
    if @GLOBAL_THEME_PARAMETERS['is_lab_member_legacy'] == true
      @GLOBAL_THEME_PARAMETERS['is_lab_member'] = true
    @GLOBAL_THEME_PARAMETERS['ten_tools_puzzle_count'] = parseInt(user_prerender['ten_tools_puzzle_count'])
    @GLOBAL_THEME_PARAMETERS['is_press_corps'] = parseInt(user_prerender['is_press_corps']) > 0
    if @GLOBAL_THEME_PARAMETERS['is_press_corps'] == true
      @GLOBAL_THEME_PARAMETERS['is_lab_member'] = false
      @GLOBAL_THEME_PARAMETERS['is_lab_member_legacy'] = false
      @GLOBAL_THEME_PARAMETERS['is_lab_member_press_corps'] = false
      if @GLOBAL_THEME_PARAMETERS['ten_tools_puzzle_count'] >= 1
        @GLOBAL_THEME_PARAMETERS['is_lab_member'] = true
        @GLOBAL_THEME_PARAMETERS['is_lab_member_legacy'] = true
        @GLOBAL_THEME_PARAMETERS['is_lab_member_press_corps'] = true
    #alert(@GLOBAL_THEME_PARAMETERS['ten_tools_puzzle_count'])

  @GOOGLE_ANALYTICS_ID = "UA-17383892-2"
  @initialize_google_analytics(@GOOGLE_ANALYTICS_ID, "")

  @GLOBAL_THEME_PARAMETERS['hide_lab_member_panel'] = true
  #@GLOBAL_THEME_PARAMETERS['waiting_for_lab_launch'] = true
  @GLOBAL_THEME_PARAMETERS['countdown_deadline'] = "2018-04-30 21:00"
  @GLOBAL_THEME_PARAMETERS['countdown_deadline_hr'] = "April 30, 2018 9:00PM PST"
  @GLOBAL_THEME_PARAMETERS['total_synth_slots'] = 8000
