class @BuilderUser extends Builder

  on_build : (block ,$container, params) ->
    user = Application.CURRENT_USER
    
    params['uid'] = user['uid']
    params['username'] = user["name"]
    params['userpicture'] = EternaUtils.get_user_picture(user['picture'])
    params['userrank'] = user["rank"]
    params['usermoney'] = if user["points"] then user['points'] else 0
    ThemeCompiler.compile_block(block,params,$container)
    
    $logout = @get_element("logout")
    
    if $logout?
      $logout.click(() =>
        Overlay.set_loading()
        Overlay.show()
        url_parameters= {workbranch:Application.WORKBRANCH, destination_url:String(window.location)}
        location = "/eterna_logout.php" + "?" + Utils.generate_parameter_string(url_parameters,true)
        Utils.redirect_to(location)  
        
      )


class @BuilderLogin extends Builder

  on_build : (block, $container, params) ->
    input = {}
    incognito_body = CookieManager.get_cookie("incognito_body")
    if incognito_body?
      try
        incognito_data = JSON.parse(incognito_body)
        input.incognito_points = incognito_data['points']
      catch e
        input = null 

    ThemeCompiler.compile_block(block,input,$container)
    $username = @get_element("username")
    $password = @get_element("password")
    $login = @get_element("login")
    
    if !$username || !$password || !$login
      Utils.display_error("Element missing in BuilderLogin")
      return

    $username.keyup((e) =>
      if e.keyCode == KeyCode.KEYCODE_ENTER
        $login.click()  
    )

    $password.keyup((e) =>
      if e.keyCode == KeyCode.KEYCODE_ENTER
        $login.click()  
    )

    $login.click(() =>
            
      username = $username.attr("value")
      password = $password.attr("value")
      
      $username.blur()
      $password.blur()
      
      if Utils.is_text_empty(username)
        Utils.display_error("Please enter username")
        return
      
      if Utils.is_text_empty(password)
        Utils.display_error("Please enter password")
        
      Overlay.set_loading()
      Overlay.show()      

      login_params = {}
      login_params['name'] = username
      login_params['pass'] = password
      login_params['type'] = "login"
      login_params['workbranch'] = Application.WORKBRANCH

      
      AjaxManager.query("POST","/login/",login_params, (ret) =>
        

        data = ret['data']
        if !data
          Utils.display_error("Regiser failed - no response")
          return
        
        if data['success']
          Utils.reload()
        else
          Utils.display_error("Register error : " + data["error"]);
          Overlay.hide()        
      )
    )

class @BuilderRegister extends Builder

  on_build : (block, $container, params) ->
    
    input = {}
    incognito_body = CookieManager.get_cookie("incognito_body")
    if incognito_body?
      try
        incognito_data = JSON.parse(incognito_body)
        input.incognito_points = incognito_data['points']
      catch e
        input = null 

    redirect_url = "/web/"
    if params['redirect_url']?
      redirect_url = params['redirect_url']
      
    ThemeCompiler.compile_block(block,input,$container)
    $username = @get_element("username-input")
    $password = @get_element("password-input")
    $password_confirm = @get_element("password-confirm-input")
    $email = @get_element("email-input")
    $register = @get_element("register-button")

    setTimeout(() =>
      grecaptcha.render("recaptcha-container", {
        "sitekey": "6LcFwUsUAAAAAOQ9szhauSNv2bJuBOUtw_pGrRnd",
        "theme": "white"
      })
    )

    if !$username || !$password || !$password_confirm || !$email || !$register
      Utils.display_error("Element missing in BuilderRegister")
      return

    $username.keyup((e) =>
      if e.keyCode == KeyCode.KEYCODE_ENTER
        $register.click()  
    )

    $password.keyup((e) =>
      if e.keyCode == KeyCode.KEYCODE_ENTER
        $register.click()  
    )

    $password_confirm.keyup((e) =>
      if e.keyCode == KeyCode.KEYCODE_ENTER
        $register.click()  
    )
    
    $email.keyup((e) =>
      if e.keyCode == KeyCode.KEYCODE_ENTER
        $register.click()  
    )    

    $register.click(() =>
            
      username = $username.attr("value")
      password = $password.attr("value")
      password_confirm = $password_confirm.attr("value")
      email = $email.attr("value")
      captcha_response = grecaptcha.getResponse()
      
      $username.blur()
      $password.blur()
      $password_confirm.blur()
      $email.blur()
      
      if Utils.is_text_empty(username)
        Utils.display_error("Please enter username")
        return
      
      if Utils.is_text_empty(password)
        Utils.display_error("Please enter password")
        return
      
      if password != password_confirm
        Utils.display_error("Password and re-entered password doesn't match")
        return
      
      if Utils.is_text_empty(captcha_response)
        Utils.display_error("Please complete the captcha")
        return

      Overlay.set_loading()
      Overlay.show()

      login_params = {}
      login_params['name'] = username
      login_params['pass'] = password
      login_params['mail'] = email
      login_params['captcha_response'] = captcha_response
      login_params['type'] = "create"
      login_params['workbranch'] = Application.WORKBRANCH
      
      AjaxManager.query("POST","/login/",login_params, (ret) =>
        data = ret['data']
        if !data
          Utils.display_error("Regiser failed - no response")
          return
        
        if data['success']
          Utils.redirect_to(redirect_url)

        else
          Utils.display_error("Register error : " + data["error"]);
          Overlay.hide()      
      )
    )

    $nova_transfer = @get_element("nova-transfer-button")
    if $nova_transfer != null
      $username_transfer = @get_element("username-transfer-input")
      $password_transfer = @get_element("password-transfer-input")
      user = Application.CURRENT_USER
      if user != undefined
        $username_transfer.attr("value", user['name'])
        $password_transfer.attr("value", "12345678")

      $username_transfer.keyup((e) =>
        if e.keyCode == KeyCode.KEYCODE_ENTER
          $nova_transfer.click()  
      )

      $password_transfer.keyup((e) =>
        if e.keyCode == KeyCode.KEYCODE_ENTER
          $nova_transfer.click()  
      )

      $nova_transfer.click(() =>
      
        username = $username_transfer.attr("value")
        password = $password_transfer.attr("value")
      
        $username_transfer.blur()
        $password_transfer.blur()
      
        if Utils.is_text_empty(username)
          Utils.display_error("Please enter username")
          return
      
        if Utils.is_text_empty(password)
          Utils.display_error("Please enter password")
          return
      
        Overlay.set_loading()
        Overlay.show()      

        login_params = {}
        login_params['name'] = username
        login_params['pass'] = password
        login_params['type'] = "novatransfer"
        login_params['workbranch'] = Application.WORKBRANCH

        AjaxManager.query("POST","/login/",login_params, (ret) =>
          data = ret['data']
          if !data
            Utils.display_error("Nova transfer failed - no response")
            return
        
          if data['success']
            Utils.redirect_to(redirect_url)

          else
            Utils.display_error("Nova transfer error : " + data["error"]);
            Overlay.hide()      
        )
      )
