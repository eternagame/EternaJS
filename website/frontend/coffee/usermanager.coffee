@UserManager  = {
  
  login_uid_ : null
  login_user_role_ : null
  
  set_user : (uid, role) ->
    @login_uid_ = uid
    @login_user_role_ = role
  
  get_current_uid : () ->
    return @login_uid_
  
  get_current_role : () ->
    return @login_user_role_
  
  logout : () ->
    
    url = Application.LOGOUT_URL
    
    if url == null 
      Utils.display_error("logout url not specified in UserManager.logout")
      return
    
    Overlay.set_loading("로그아웃 중입니다")
    Overlay.show()
    
    AjaxManager.query("GET", url,null,
      () ->
        location.reload(true)
      ,
      () ->
        Utils.display_error("로그아웃 실패 - 들어올땐 마음대로였겠지만 나갈때는 아니란다")
        Overlay.hide()
    )
 
}
