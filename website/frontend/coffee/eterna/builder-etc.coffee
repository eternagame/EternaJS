class @BuilderChat extends Builder

  on_build : (block ,$container, params) ->
    user = Application.CURRENT_USER
    input_params = null
    
    if user?
      input_params = {}
      input_params['chatvars'] = Utils.generate_parameter_string({name:user['name'], uid:user['uid']})

    ThemeCompiler.compile_block(block,input_params,$container)

    
    if $chat_container = @get_element("chat-container")
      if $expand_chat = @get_element("expand-chat")
        $expand_chat_text = @get_element("expand-chat-text")
        expanded = false
        $expand_chat.click(() =>
          expanded = !expanded
          if expanded
            $chat_container.css("height", "700px")
            if $expand_chat_text
              $expand_chat_text.html("Shrink")
          else
            $chat_container.css("height", "300px")
            if $expand_chat_text
              $expand_chat_text.html("Expand chat")
        )
    

class @BuilderFBConnect extends Builder 
  
  on_build : (block, $container, params) ->
    
    fb_clicked = false
    
    ThemeCompiler.compile_block(block, params, $container)
    
    $container.click(() =>
      if fb_clicked
        return
      
      fb_clicked = true
      
      FB.init({
        appId: Application.FB_APPID, cookie: true,
        status: true, xfbml: true
      })        

      FB.login((response) =>
        if response.authResponse
          window.location = "/user/"
        else
          fb_clicked = false
      )
    )
