@CookieManager = {
  
  get_cookie : (check_name) ->
    a_all_cookies = document.cookie.split( ';' )
    a_temp_cookie = ''
    cookie_name = ''
    cookie_value = ''
    b_cookie_found = false

    for  i in [0..a_all_cookies.length-1]
      # now we'll split apart each name=value pair
      a_temp_cookie = a_all_cookies[i].split( '=' )

      # and trim left/right whitespace while we're at it
      cookie_name = a_temp_cookie[0].replace(/^\s+|\s+$/g, '');

      # if the extracted name matches passed check_name
      if  cookie_name == check_name
        b_cookie_found = true
        # we need to handle case where cookie has no value but exists (no = sign, that is):
        if a_temp_cookie.length > 1
          cookie_value = unescape( a_temp_cookie[1].replace(/^\s+|\s+$/g, '') )
     
        # note that in cases where cookie is initialized but no value, null is returned
        return cookie_value
      
      a_temp_cookie = null
      cookie_name = ''
        
    if !b_cookie_found
      return null

  set_cookie : ( name, value, expires ) ->
    # set time, it's in milliseconds
    today = new Date()
    today.setTime( today.getTime() )

    ###
      if the expires variable is set, make the correct
      expires time, the current script below will set
      it for x number of days, to make it for hours,
      delete * 24, for minutes, delete * 60 * 24
    ###
    
    if expires
      expires = expires * 1000 * 60 * 60 * 24
    else
      expires = 3650 * 1000 * 60 * 60 * 24
    
    expires_date = new Date( today.getTime() + (expires) )

    document.cookie = name + "=" +escape( value ) +
      (if expires then ";expires=" + expires_date.toGMTString() else "" ) +
      ";path=/"

  delete_cookie : (name) -> 
    if !@get_cookie(name)
      return
    
    document.cookie = name + "=0;expires==Thu, 01-Jan-1970 00:00:01 GMT;path=/"

}
