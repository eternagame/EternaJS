if typeof Array.prototype.indexOf != 'function'
  Array.prototype.indexOf = (needle) ->
    for ii in [0..@length-1] by 1
      if @[ii] == needle
        return ii
    return -1


Array.prototype.is_array = (value) ->
  value and
    typeof value is 'object' and
    value instanceof Array and
    typeof value.length is 'number' and
    typeof value.splice is 'function' and
    not ( value.propertyIsEnumerable 'length' )


Array.prototype.last = () ->
  if @length > 0
    return @[@length-1]
  return null


Array.prototype.get_random = () ->
  return @[Math.floor(Math.random() * @length) % @length]


Array.prototype.clone = () ->
  new_array = new Array()
  for ii in [0..@length-1] by 1
  
    val = @[ii]
    
    if typeof val == "object" && val instanceof Array
      val = val.clone()
    else if typeof val == "object"
      val = Utils.clone_object(val)
  
    new_array.push(val)
  
  return new_array

Array.prototype.remove = (i) ->
  @splice(i,1)

Array.prototype.swap = (i,j) ->
  array = @
  temp = array[i]
  array[i] = array[j]
  array[j] = temp

String.prototype.hash_code = () ->

  hash = 0
  if @length == 0 then return hash
  for i in [0..@length-1] by 1
    char = this.charCodeAt(i)
    hash = ((hash<<5)-hash)+char
    hash = hash & hash

  return hash;



# Custom jQuery extension

jQuery.fn.extend({
  to_html: () ->
    Utils.display_debug_messge("Why the hell are you using jQuery.to_html?")
    return $('<div>').append(@clone()).remove().html()

  is_inside : (x,y) ->  
    result = false
    @eq(0).each(() =>  
      $current = $(this)
      offset = $current.offset()             
      result = offset.left<=x && offset.left + $current.outerWidth() > x && offset.top<=y && offset.top + $current.outerHeight() > y 
    )  
    return result
})


@KeyCode = {
  KEYCODE_DELETE : 46,
  KEYCODE_ENTER : 13,
  KEYCODE_ESCAPE : 27,
  KEYCODE_LEFT_ARROW : 37,
  KEYCODE_RIGHT_ARROW : 39,
  KEYCODE_UP_ARROW : 38,
  KEYCODE_DOWN_ARROW : 40
}

@Utils = {
    
  display_error : (msg) ->
    alert(msg)
    if console? && console.log?
      console.log("console error : " + msg)
    
  display_debug_message : (msg) ->
    if console? && console.log?
      console.log("console debug : " + msg)

  display_message : (msg) ->
    alert(msg)

  clone_object : (obj) ->
    
    if typeof obj == "object" && obj instanceof Array
      return obj.clone()
    
    newobj = new Object()
    for own key,value of obj
      if typeof value == "object" && value instanceof Array
        value = value.clone()
      else if typeof value == "object"
        value = @clone_object(value)
    
      newobj[key] = value
    return newobj

  add_objects : (obj1, obj2) ->
  
    if !obj1 && !obj2
      return null
    
    obj = new Object()
    
    if obj1
      for own key,val of obj1
        obj[key] = val
      
    if obj2
      for own key,val of obj2
        obj[key] = val

    return obj

  to_https : (addr) ->

    if addr.search("http://") >= 0
      return addr.replace("http://","https://")
  
    if addr.search(/\./gi) >= 0
      addr = addr.replace(/[a-zA-Z]+:\/\//gi,"")
      return "https://" + addr
  
    if addr.search(/^\//gi) < 0 
      addr = "/" + addr
      
    return "https://" + window.location.hostname + addr

  to_uri : (url) ->
    uri = url.replace(/^http:\/\/[^\/]*/,"")
    uri = uri.replace(/^https:\/\/[^\/]*/,"")
    uri = uri.replace(/#.*$/,"")

    if @is_text_empty(uri)
      return "/"
    else
      return uri
  
  get_hostname : (url) ->
    protocol_match = (/^[a-zA-Z]+:\/\//i).exec(url)
    protocol = ""
    
    if protocol_match?
      protocol = protocol_match[0]
      url = url.replace(protocol,"")
      
    host_match = (/^[^\/]+/i).exec(url)
    
    if host_match?
      return protocol + host_match[0]
    
    return null        

  to_url : (url, uri) ->
    
    if uri.match(/\..+\//gi)
      return uri
    
    protocol = url.match(/[a-z]+:\/\//gi)
    if protocol == null 
      protocol = "http://"
    else
      url = url.replace(protocol,"")
      
    url = url.replace(/\?.+$/gi,"")
    url = url.replace(/[^\/]+\.[^\/]+$/gi,"")
    post_hostname = String(url.match(/\/.+$/gi))
    hostname = url.replace(post_hostname,"")
    
    if post_hostname.charAt(post_hostname.length-1) == "/"
      post_hostname = post_hostname.substr(0,post_hostname.length-1)

    absolute = true
    if uri.charAt(0) != "/"
      absolute = false
    
    if uri.match(/^\/\//gi)
      return protocol + url.replace(/^\/\//gi,"") + uri
    
    if absolute
      return protocol + hostname + uri
    else
      return protocol + hostname + post_hostname + "/" + uri

  open_pop : (url,width,height) ->
    window.open(url, "_blank", "toolbar=0,status=0,width=" + width + ",height=" + height);

  get_window_scroll : () ->
    # FF only accepts html,body. Chrome only accepts body 
    return Math.max($("body").scrollTop(), $("html, body").scrollTop())

  get_window_top : ($obj) ->
    walker = $obj[0].offsetParent
    top = if walker then walker.offsetParent else 0
    
    while walker
      top += walker.offsetTop
      walker = walker.offsetParent 

    return top

  is_meta_key : (e) ->
    return (e.ctrlKey || e.metaKey)

  set_title : (text) ->
    $(document).attr("title", text)

  get_url_token_string : (token, value) ->
    return token + "=" + value

  get_url_var : (token,url) ->
    url_map = @get_url_vars(url)
    if url_map[token]
      return url_map[token]
    else
      return null

  get_url_vars : (url) ->
    map = {}
    if !(url?)
      url = window.location.search
    
    parts = url.replace(/[?&]+([^=&]+)(=[^&]*)?/gi, (m,key,value) => 
      map[key] = if value == undefined then null else @url_decode(value.substring(1)) 
    )
    
    return map

  get_time : () ->
    d = new Date()
    current_time = d.getTime()
    current_time += d.getTimezoneOffset() * 60000
    return Math.floor(current_time / 1000)


  get_time_ago : (time) ->
    
    diff = @get_time() - time
    if diff < 60 
      return "1 분 전";
    else if diff < 3600 
      mins = Math.floor(diff/60)
      if mins == 1
        return "1 분 전"
      else
        return Math.floor(diff/60) + " 분 전"
    else if(diff < 86400)
      hours = Math.floor(diff/3600)
      if(hours ==1)
        return "1 시간 전"
      else
        return Math.floor(diff/3600) + " 시간 전"
    else
      days = Math.floor(diff/86400)

      if days == 1
        return "1 일 전"
      else
        return Math.floor(diff/86400) + " 일 전"
  
  get_monthdate_from_string : (timestring) ->
    return timestring.replace(/T.*$/gi,"")
  
  get_time_from_string : (timestring) ->
    if timestring == null
      return null
    
    timestring = (String(timestring)).replace(/-/g,"/").replace(/[TZ]/g," ")
    timestring = timestring.replace(/\..*/gi,"")
    
    return Date.parse(timestring) / 1000.0

  get_time_ago_from_string : (timestring) ->
    if timestring == null
      return null
    
    timestring = (String(timestring)).replace(/-/g,"/").replace(/[TZ]/g," ")
    timestring = timestring.replace(/\..*/gi,"")
    
    time = Date.parse(timestring) / 1000.0
    return @get_time_ago(time)

  url_encode : (source) ->
    encoded = source
    regular = new RegExp("/","g")
    encoded = encodeURIComponent(encoded)
    encoded = encoded.replace(/\+/g,"%2B")
    encoded = encoded.replace(regular,"%2F")
    encoded = encoded.replace(/\&/g, "%26")

    return encoded

  url_decode : (source) ->
    decoded = source
    
    try 
      decoded = decodeURIComponent(decoded)
    catch x 
      return false

    return decoded

  is_text_empty : (text) ->
    if !text 
      return true

    return (text.replace(/\s/gi,"") == "")

  strip_html : (text,tag_to_strip) ->
    if !text
      return null

    text = text.replace(/<\s*\/?\s*([^>]*)\s*\/?\s*>/gi, (match,tag) ->
      
      if tag_to_strip
        match_lower = match.toLowerCase()
        found = false
        for ii in [0.. tag_to_strip.length-1]
          tag_lower = tag_to_strip[ii].toLowerCase()
          if match_lower.search(tag_lower) >= 0
            found = true
        
        if !found
          return match
      
      match = match.replace(/</gi,"&lt;")
      match = match.replace(/>/gi,"&gt;")
      
      return match
    )

    return text

  not_strip_html : (text, tag_not_to_strip) ->
    if !text
      return null

    text = text.replace(/<\s*\/?\s*([^>]*)\s*\/?\s*>/gi, (match,tag) ->
      
      if tag_not_to_strip
        match_lower = match.toLowerCase()
        found = false
        for ii in [0.. tag_not_to_strip.length-1]
          tag_lower = tag_not_to_strip[ii].toLowerCase()
          if match_lower.search(tag_lower) >= 0
            found = true
        
        if found
          return match
      
      match = match.replace(/</gi,"&lt;")
      match = match.replace(/>/gi,"&gt;")
      
      return match
    )

    return text    

  escape_html : (text) ->
    if text == null
      return null

    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")

  remove_html : (text) ->
    if text == null
      return null
      
    return text.replace(/(<([^>]+)>)/ig,"")

  #kws add
  to_html : (text) ->
    text = @not_strip_html(text, ["br", "img", "a"])
    text = @newline_to_br(text)
    return text

  markup : (text) ->
    if text.indexOf("<a href=") != -1 or text.indexOf("<img src=") != -1
      return text
      
    end = 0
    while true
      start = text.indexOf("http://", end)
      if start == -1 
        break
      for ii in [start..text.length-1]
        if text[ii] == ' ' or text[ii] == '<' then break
      end = ii
      url = text.substring(start, end)
      left = text.substring(end)
      text = text.substring(0, start) + "<a href=\"" + url + "\">" + url + "</a>"
      end = text.length;
      text += left
    return text

  is_html_text_empty : (text) ->
    if !text
      return true
  
    text = text.replace(/<(.|\n)*?>/gi,"")
    text = text.replace(/\n/gi,"")
    text = text.replace(/\s/gi,"")
    text = text.replace(/&nbsp;/gi,"")

    return (text == "")

  is_int : (s) ->
    return parseInt(s) == s


  generate_parameter_string : (tokens, url_encode) ->
    string = ""
    first = true
    if tokens
      for own key,value of tokens
        if !Utils.equals_null(value) 
          if(!first)
            string += "&";
          if typeof value == 'object'
            value = JSON.stringify(value)
          if(!url_encode)
            string += key + "=" + value
          else
            string += key + "=" + @url_encode(value)
          first = false
    return string

  get_object_from_parameter_string : (string) ->
    map = {}
    string.replace(/[?&]+([^=&]+)(=[^&]*)?/gi, (m,key,value) =>
      map[key] = if value == undefined then true else @url_decode(value.substring(1)) 
    )
    string.replace(/^([^=&]+)(=[^&]*)?/gi, (m,key,value) => 
      map[key] = if value == undefined then true else @url_decode(value.substring(1)) 
    )
    return map

  is_IE : () ->
    return navigator.appName.match(/Microsoft/gi)

  get_IE_version : () ->
    if navigator.appVersion.indexOf("MSIE") != -1
      return parseFloat(navigator.appVersion.split("MSIE")[1])  
    return null
    
  is_mobile : () ->
    mobile = (/iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(navigator.userAgent.toLowerCase()))
    if mobile
      return true
    else
      return false
      
  get_browser_width : () ->
    return $(window).width()
  
  get_browser_height : () ->
    return $(window).height()
  
  reload : () ->
    window.location.reload(true)

  json_to_object : (str) ->
    try 
      return JSON.parse(str)
    catch exception
      return str

  parseInt : (n) ->
    if !(n?)
      return 0
    return parseInt(n)

  get_linked_string : (str, url, target) ->
    res = "<a href='" + url
    if target
      res += "' target='" + target
    
    res += "'>" + str + "</a>"
    return res
  
  newline_to_br : (str) ->
    if str == null
      return str
    str = str.replace(/\r\n/g,"<br/>")
    str = str.replace(/\r/g,"<br/>")
    return str.replace(/\n/g,"<br/>")
    
  equals_null : (obj) ->
    return obj == null || obj == undefined
  
  redirect_to : (url) ->
    if @is_text_empty(url)
      @reload()
      return

    window.location = url
    
  can_push_state : () ->
    # Old Safari has critical history bug. Don't use.
    if $.browser.webkit && parseFloat($.browser.version) < 534.10
      return false
    
    return history && history.pushState
    
  is_valid_url : (url) ->
    reg_url = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
    
    return reg_url.test(url)
  
  shorten_str : (str, lm) ->
    if str.length > lm
      return str.substr(0,lm-2) + ".."
    else
      return str

  get_lab_flash_filename : () ->
    return "/eterna_resources/Eterna78.swf"
    
}

VideoUrlUtils = {
  youtube_reg_exp : /^http:\/\/(?:www\.)?youtube.com\/watch\?(?=.*v=((\w|-)+))(?:\S+)?$/
  vimeo_reg_exp : /^http:\/\/(?:www\.)?vimeo\.com\/(?:clip\:)?(\d+).*$/
  tvpot_reg_exp : /^http:\/\/(?:www\.)?tvpot.daum.net\/clip\/ClipViewByVid\.do\?vid=((\w|-|\$)+)$/
  
  is_youtube_url : (url) ->
    return url.match(@youtube_reg_exp)

  is_vimeo_url : (url) ->
    return url.match(@vimeo_reg_exp)

  is_tvpot_url : (url) ->
    return url.match(@tvpot_reg_exp)
    
  convert_youtube_url : (url) ->
    return url.replace(@youtube_reg_exp, 'http://www.youtube.com/embed/$1?wmode=transparent')

  convert_vimeo_url : (url) ->
    return url.replace(@vimeo_reg_exp, 'http://player.vimeo.com/video/$1')

  convert_tvpot_url : (url, width, height) ->
    return url.replace(@tvpot_reg_exp, "<object type='application/x-shockwave-flash' id='$1' width='#{width}px' height='#{height}px' align='middle' classid='clsid:d27cdb6e-ae6d-11cf-96b8-444553540000' codebase='http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,0'><param name='movie' value='http://flvs.daum.net/flvPlayer.swf?vid=$1' /><param name='wmode' value='transparent' /><embed src='http://flvs.daum.net/flvPlayer.swf?vid=$1' width='#{width}px' height='#{height}px' wmode='transparent'></embed></object>")
}

