@Pervasives = {
  _get_lists : () ->
    return ["clear","out","outln","draw","zoomin","zoomout"]
    
  _set : (key, func, w) ->
    w[key] = func
    
  init : (w) ->
    lists = @_get_lists()
    for ii in [0..lists.length-1]
      @_set(lists[ii], @[lists[ii]], w)

  ignore : () ->
    lambda = () ->
      #do nothing
      return true
    if window then w = window
    else 
      return  
    lists = @_get_lists()
    for ii in [0..lists.length-1]
      @_set(lists[ii], lambda, w)
    
  #out helper
  _pre_out : (result, pipe) ->
    for ii in [0..pipe.length-1]
      func = pipe[ii]
      result = func(result)
    return result
  
  _coloring : (text) ->
    _set_color = (_text, word, color) ->
      _regexp = "/"+word+"/gi"
      _text = _text.replace(_regexp, "<span style='color:"+color+";'>"+word+"</span>")
      return _text
    text = _set_color(text, "PASS", "green")
    text = _set_color(text, "FAIL", "red")
    text = _set_color(text, "true", "blue")
    text = _set_color(text, "false", "red")

  out : (result) ->
    $result = $('#result')
    value = $result.get(0).innerHTML
    $result.html(value + result)
    
  outln : (result) ->
    @out result
    @out "<br>"  
  
  clear : () ->
    $result = $('#result')
    $result.html("")
  
  draw : (secstruct, sequence, width, height, div, background_color) ->    
    if !(@_div_container?)
      @_div_container = new Array
      
    if div?
      div.change_structure_to(secstruct)
      div.change_sequence_to(sequence)
    else
      _div_id = @_div_container.length
      divstr = "<div id='_draw"+_div_id+"'></div>"
      @_div_container.push(divstr)
      Pervasives.outln(divstr)
      div = EternaUtils.draw_secstructure(secstruct, $('#_draw'+_div_id), sequence, null, null)
    return div
  
  zoomin : (div) ->
    div.zoom_in()
    
  zoomout : (div) ->
    div.zoom_out()
}

@ScriptInterface = {
  eval : (testsets, cb) ->
    Script.evaluate_testsets(testsets, cb)
  
  #input management  
  set_input_val : (input_array, index, value) ->
    if input_array.length > index
      input_array[index]['val'] = value
    return input_array  

  codify_input : (input_array) ->
    param = ""
    if input_array.length > 0
      for i in [0..input_array.length-1]
        input = input_array[i]
        if input['value']
          param += "var " + input['value'] + "='" + (
            if input['val']
            then input['val'].replace(/'/g, "<ETERNASINGLEQUOTEESCAPE>") + "'.replace(/<ETERNASINGLEQUOTEESCAPE>/g, \"'\");"
            else "';"
          )
    return param
  
  set_library : (Library) ->
    @Lib = Library
  set_pervasives : (p) ->
    @Pervasives = p
  set_rna : (RNA) ->
    @RNA = RNA
  set_rnaelement : (RNAElement) ->
    @RNAElement = RNAElement
  set_rnaexception : (RNAException) ->
    @RNAException = RNAException
    
  evaluate_init : () ->
    if Library != null && !(@Lib?) 
      @Lib = Library
    if !(@RNA?)
      @RNA = RNA
    if !(@RNAElement?)
      @RNAElement = RNAElement
    if !(@RNAException?)
      @RNAException = RNAException
    if !(@Pervasives?)
      @Pervasives = Pervasives
    if window? and !(window.out?)
      @Pervasives.init(window)
    
  #evaluation
  evaluate : (source) ->
    @evaluate_init()
    ret = {}
    try
      Library = @Lib
      Lib = new Library()
      RNA = @RNA
      RNAElement = @RNAElement
      RNAException = @RNAException
      _global_timer = new Date()
      code = '(function(){'+source+'})()'
      ret['cause'] = eval(code) 
      ret['result'] = true
      ret['eval_time'] = (new Date()).getTime() - _global_timer.getTime();
      return ret
    catch Error
      ret['cause'] = Error.message
      ret['result'] = false
      ret['eval_time'] = (new Date()).getTime() - _global_timer.getTime();
      return ret

  evaluate_flash : (nid, sequences, constraints) ->
    params = {'sequences':sequences, 'constraints':constraints}
    ScriptInterface.evaluate_script_with_nid(nid, params, (result)=>
      if maingame = document.getElementById('maingame')
        maingame.end(result)
    )

  evaluate_script_with_nid : (nid, params, callback, _sync) ->
    Script.get_script(nid, (data)=>
      if data['script'].length == 0
        alert "please check nid"
        return
      script = data['script'][0]
      input_array = JSON.parse(script['input'])
      if input_array.length > 0 and params?
        for ii in [0..input_array.length-1]
          input = input_array[ii]
          parameter_name = input['value']
          if params[parameter_name]
            @set_input_val(input_array, ii, params[parameter_name])
        coded_input = @codify_input(input_array)
      else
        coded_input = ""
        
      if params? and params.timeout? then timeout = params.timeout
      else timeout = 10
      source = @insert_timeout(script['source'], timeout)
      
      if @Pervasives?
        @Pervasives.ignore()
      result = @evaluate(coded_input + source)
      if maingame = document.getElementById("maingame")
        if maingame['end_'+nid]
          maingame['end_'+nid](result)
        else if maingame['end']
          maingame.end(result)

      if callback
        callback(result)
    , if (_sync?) then _sync else false)

  evaluate_puzzle_solving : (script, secstruct, timeout) ->
    input_array = JSON.parse(script['input'])
    input_array = @set_input_val(input_array, 0, secstruct)
    input = @codify_input(input_array)
    if !(timeout?) then timeout = 10
    source = @insert_timeout(script['source'], timeout)
    if @Pervasives?
      @Pervasives.ignore()
    result = @evaluate(input + source)
    return result

  evaluate_solution_scoring : (script, secstruct, sequence) ->
    input_array = JSON.parse(script['input'])
    input_array = @set_input_val(input_array, 0, secstruct)
    input_array = @set_input_val(input_array, 1, sequence)
    input = @codify_input(input_array)
    source = @insert_timeout(script['source'], 10)
    if @Pervasives?
      @Pervasives.ignore()
    result = @evaluate(input + source)
    return result
    
  #helpers
  insert_timeout_depcrecated : (source, timeout) ->
    inserted_code = "if((new Date()).getTime() - global_timer.getTime() > " + timeout * 1000 + ") {outln(\""+timeout+"sec timeout\");return 'timeout';};"
    #regexp = /while\s*\(.*\)\s\{?|for\s*\(.*\)\s\{?/
    regexp = /while\s*\([^\)]*\)\s*\{?|for\s*\([^\)]*\)\s*\{?/
    code = "var global_timer = new Date(); "
    while(source.search(regexp) != -1)
      chunk = source.match(regexp)[0]
      index = source.indexOf(chunk) + chunk.length
       
      # if while or for with no {}
      if(chunk.charAt(chunk.length-1)) != "{"
        nextRegexp = /.*[\(.*\)|[^;]|\n]*;{0,1}/
        # get nextline(until find ;)
        nextline = source.substring(index)
        nextline = nextline.match(nextRegexp)[0]
        code += source.substring(0, index) + "{" + inserted_code + nextline + "}"
        index += nextline.length
      else 
        # if while or for with bracket 
        code += source.substring(0, index) + inserted_code
      if(source.length > index) then source = source.substring(index)
      else
        source = ""
        break
    code += source
    return code   
  
  balance : (open, close, start, code) ->
    stack = new Array()
    isStart = false
    for ii in [start..code.length-1]
      if code[ii] == open
        if !isStart
          isStart = true
        stack.push(ii)
      else if code[ii] == close
        stack.pop()
      if isStart and !stack.length then return ii
    return -1  
  
  balance_search : (target, start, code) ->
    stack = new Array()
    for ii in [start..code.length-1]
      if code[ii] == "(" || code[ii] == "{" then stack.push(ii)
      else if code[ii] == ")" || code[ii] == "}" then stack.pop()
      if stack.length == 0 and code[ii] == target then return ii
    
    return ii
  
  insert_timeout : (source, timeout) ->
    inserted_code = "if((new Date()).getTime() - global_timer.getTime() > " + timeout * 1000 + ") {outln(\""+timeout+"sec timeout\");return 'timeout';};"
   
    #regexp = /while\s*\([^\)]*\)\s*\{?|for\s*\([^\)]*\)\s*\{?/
    regexp = /(while\s*\()|(for\s*\()/m
    code = "var global_timer = new Date(); "
    while(source.search(regexp) != -1)
      chunk = source.match(regexp)[0]
      index = @balance("(", ")", source.indexOf(chunk), source) + 1
      
      for ii in [index..source.length-1]
        if source[ii] != " " and source[ii] != "\n" then break;
      index = ii   
      # if while or for with no {}
      
      if(source.charAt(index)) != "{"
        #nextRegexp = /.*[\(.*\)|[^;]|\n]*;{0,1}/
        #nextline = source.substring(index)
        #nextline = nextline.match(nextRegexp)[0]
        jj = @balance_search(";", index, source)
        # get nextline(until find ;)
        nextline = source.substring(index, jj + 1)
        code += source.substring(0, index) + "{" + inserted_code + nextline + "}"
        index += nextline.length
      else 
        # if while or for with bracket 
        code += source.substring(0, index + 1) + inserted_code
      if(source.length > index) then source = source.substring(index + 1)
      else
        source = ""
        break
    code += source
    return code  
}                      

class @LibLoader
  constructor : () ->
    @url = "/EteRNA-Script-Interface/Eterna/library/"
    @states = new Array
    @_use = true
    
  setUse : (b) ->
    @_use = b
  
  getUse : () ->
    return @_use
  
  setDefaultUrl : (url) ->
    @url = url
  
  getDefaultUrl : () ->
    return @url
  
  check : (libs) ->
    for ii in [0..libs.length-1]
      if libs['name']? then return false
    return true
    
  getName : (lib) ->
    if lib
      return lib['name']
  
  getUrl : (lib) ->
    if lib
      return lib['url']
  
  remove : (code) ->
    #regexp = /\/\/.*|\/\*.*\*\/|\".*\"/
    regexp = /(\/\*[\w\'\s\r\n\*]*\*\/)|(\/\/[\w\s\']*)|(\".*\")|(\'.*\')/
    revised = code
    while(revised.search(regexp) != -1)
      chunk = revised.match(regexp)[0]
      start = revised.indexOf(chunk)
      revised = revised.substring(0,start) + revised.substring(start+chunk.length)
    return revised
    
  parse : (code, cb) ->
    # temporarily hardcoded libraries
    # must be refactored
    libs = [{name:"LibVrna185"},{name:"LibVrna211"}]
    need = new Array
    
    rcode = @remove(code)
    for ii in [0..libs.length-1]
      lib = libs[ii]
      if rcode.indexOf(@getName(lib)) != -1
        need.push(lib)
    cb(need)

  dynamicLoad : (libs, before_cb, after_cb, final_cb) ->
    if !libs.length || !@getUse()
      final_cb()
      return
    
    _isFinish = (num) =>
      return @getStates().length >= num
      
    for ii in [0..libs.length-1]
      lib = libs[ii]
      if lib
        _name = @getName(lib)
        _url = @getUrl(lib)
        before_cb(lib)
        if s = @alreadyLoad(_name,"js",_url)
          after_cb(s)
          if _isFinish(libs.length) && ii==libs.length-1 
            final_cb(@getStates())  
        else  
          do (_name, _url) =>
            @load(_name, "js", _url, (data,textStatus,jqxhr)=>
              state = @makeState(_name,_url,textStatus)
              @setState(state)
              after_cb(state)
              if _isFinish(libs.length)
                final_cb(@getStates())
                return
              )
       
  load : (name, ext, url, cb) ->
    if url
      target = url + name + "." + ext
    else
      target = @liburl(name)
    #$.getScript(target, (data, textStatus, jqxhr)=>
    #  if cb
    #    cb(data,textStatus,jqxhr)
    #)
    $.getScript(target).done((script, status)=>
      if cb
        cb(script, status, {})
    ).fail((jqxhr, settings, exception) =>
      alert("library load fail")
    )
    
  alreadyLoad : (name, ext, url) ->
    if states = @getStates()
      for ii in [0..states.length-1]
        state = states[ii]
        if state && @getNameFromState(state) && @getNameFromState(state) == name
          return state
    return null
       
  getStates : () ->
    return @states
        
  setState : (state) ->
    if @getStates()
      @getStates().push(state)
    else
      @states = new Array
      @states.push(state)
  
  resetStates : () ->
    @states = new Array
  
  makeState : (name,url,ok) ->
    return {"name":name,"url":url,"ok":ok}
  
  getNameFromState : (state) ->
    return state['name']
  
  getUrlFromState : (state) ->
    return state['url']
  
  getSuccessFromState : (state) ->
    return state['ok']    
  liburl : (name) ->
    return @url+name+".js"

