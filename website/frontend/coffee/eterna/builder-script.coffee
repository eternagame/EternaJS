class @BuilderScriptListsPage extends Builder
   
  on_build : (block, $container, params) ->
    skip = params['skip']
    size = params['size']
    search = params['search']
    sort = params['sort']
     
    if !(sort?)
      sort = "date"
     
    params.sort = sort  
    param_string = {}
    param_string.sort = "date"
    params['date_sort_url'] = "/web/script/?" + Utils.generate_parameter_string(param_string)
    param_string.sort = "success_rate"
    params['success_rate_sort_url'] = "/web/script/?" + Utils.generate_parameter_string(param_string)
     
    if !(skip?)
      skip = 0
    if !(size?)
      size = 10
    ThemeCompiler.compile_block(block,params,$container)
     
    if $search = @get_element("search")
      $search.attr("value", search)
      $search.keyup((e) =>
        if e.keyCode == KeyCode.KEYCODE_ENTER
          search = $search.attr("value")
          param_string.search = search
          url = "/web/script/?" + Utils.generate_parameter_string(param_string)
          Utils.redirect_to(url)
      )  
      
    #initialize lists of script
    if $script_lists_container = @get_element("script_lists")
      Script.get_script_lists_with_sort(skip,size, null,sort,search,(data) =>
        block = Blocks("script-lists")
        @set_script_lists(block, $script_lists_container, data['lists'])
        @set_pager($script_lists_container, skip, size, (pageindex) =>
          url_params = {skip:pageindex * size, size:size, search:search, sort:sort}
          if search?
            url_params['search'] = search
          return "/web/script/?" + Utils.generate_parameter_string(url_params, true)
        , data)
      )

    $('.remove_button').live('click',(event) =>
      Overlay.set_loading("replying..")
      Overlay.show()    
      nid = (event.target.id).split("-")[2]
      Script.remove_script(nid, (data) =>
        if data['success']
          Overlay.hide()
          url = "/web/script/"
          Utils.redirect_to(url)
      )
    )
    
    if $sendfeedback = @get_element("sendfeedback")
      $sendfeedback.click(()->
        window.open("https://getsatisfaction.com/eternagame/categories/eternagame_tools")
      )
      
  set_pager : ($container, skip, size, callback, data) ->
    if $pager = @get_element("pager")
      total_script = data['total_script']
      pager_str = EternaUtils.get_pager(Math.floor(skip /size), Math.ceil(total_script/size), (pageindex) =>
        return callback(pageindex)
      )
      $pager.html(pager_str)
       
  set_script_lists : (block, $container, lists) ->
    script_params = []
    for i in [0..lists.length-1] by 1
      script = lists[i]
      script_param = {}
      nid = script['nid']
      script_param['id'] = nid
      script_param['title'] = script['title']
      script_param['name'] = script['author']['name']
      script_param['uid'] = script['author']['uid']
      script_param['body'] = script['body']
      script_param['created'] = script['created']
      script_param['commentcounts'] = script['commentcounts']
      script_param['success_rate'] = script['success_rate']
      script_param['type'] = script['type']
      if Application.CURRENT_USER?
        script_param['user_id'] = Application.CURRENT_USER['uid']
      else
        script_param['user_id'] = null
      if !(script_param['success_rate']?) || isNaN(script_param['success_rate'])
        script_param['success_rate'] = "0.00"
      else 
        script_param['success_rate'] = new Number(script_param['success_rate']*100).toFixed(2)
      script_param['tested_time'] = script['tested_time']
      if !(script_param['tested_time']?)
        script_param['tested_time'] = "Please wait for test results" 
      block.add_block($container, script_param)

class @BuilderScriptPage extends Builder
  on_build : (block, $container, params) ->
    @Puzzle_solving = "Puzzle solving"
    @RNA_scoring = "RNA scoring"
    @Booster = "Booster"
    @Etc = "Etc"
    
    params['readonly'] = false
    
    script_create = (block, $container, params) =>
      @build_script_create(block, $container, params)
      @initialize_option_type()
      @initialize_script_batch() 
      @initialize_test_script()
      if !(params['type']) or params['type'] == @Puzzle_solving
        @initialize_test_script_local(@Puzzle_solving)  
    
    #initialize if show codes
    if params['nid'] || params['id']
      if params['nid'] then id = params['nid'] else id = params['id']
      Script.increase_pageview(id, (data) ->
        )
        
      Script.get_script(id, (data) =>
        script = data['script'][0]
        params.script = script
        params.type = script['type']
        if params['nid']
          params['comments'] = data['comments']
          @build_script_show(block, $container, params)
          @initialize_test_script_local(params.type)
          @initialize_script_batch() 
          if script['type'] == "Puzzle solving"
            @initialize_test_script()
        else script_create(block, $container, params)
      )

    else script_create(block, $container, params)
     
    return @
    
  findIdOfInput : (inputName) ->
    inputs = @get_inputs()
    for ii, input of inputs
      if input['value'] == inputName then return input['name'] + "-value"
    return null
      
  initialize_sample_testsets : (params) ->
    if params['nid']
      # show
      if $sample_testsets_select = @get_element("sample-testsets-select")
        $sample_testsets_select.change(()=>
          val = $("#sample-testsets-select option:selected").val()
          if val == "" 
            @clear_inputs()
            return
            
          val = JSON.parse(unescape(val))
          for key, value of val
            value_id = @findIdOfInput(key)
            if $input_value = @get_element(value_id)
              $input_value.val(value)
          )
        if params['script'] and params['script']['samples']  
          block = Blocks("sample-testsets-option")
          samples = params['script']['samples']
          if samples.length
            for ii in [0..samples.length-1]
              try
                sample = samples[ii]
                name = sample['name']
                value = escape(JSON.stringify(sample['value']))
                if !(name?) then name = "Sample" + ii
                if !(value?) then throw "error"
              catch Error
                name = "Corrupted sample testsets ( "+Error.message+")"
                value = ""
              block.add_block($sample_testsets_select, {name:name, value:value})
            
            
    else
      # create
      if $add_testsets = @get_element("add-testsets")
        testset_counts = 0
        $add_testsets.click(()=>
          if $sample_testsets = @get_element("sample-testsets")
            block = Blocks("sample-testset")
            block.add_block($sample_testsets, {count:testset_counts})
            testset_counts++ 
          )
    
  
  initialize_script_batch : () ->
    if $test_script_batch = @get_element("test-script-batch")
      $test_script_batch.click(()=>
        Overlay.set_loading("replying..")
        Overlay.show()
        Script.get_puzzles_for_batch({}, (data)=>
          puzzles = data['puzzles']
          for ii in [0..puzzles.length-1]
            puzzle = puzzles[ii]
            if puzzle
              secstruct = puzzle['secstruct']
              input_array = ScriptInterface.set_input_val(@get_inputs(), 0, secstruct)
              input = ScriptInterface.codify_input(input_array)
              @on_evaluate_with_var(input,@editor.getValue(),@get_timeout(), (result) =>
                Pervasives.outln("================ Test on the batch results with puzzle("+puzzle['nid']+").... ================ ")
                @print_test_puzzle_results(puzzle, result)        
              )
          Overlay.hide() 
          @scroll_to_result_console()
          )
        )
  
  initialize_option_type : () ->
    $script_type = @get_element("script_type")
    $puzzle_solving = @get_element("puzzle-solving")
    $rna_scoring = @get_element("rna-scoring")
    if $script_type
      if sel = $('#script_type option:selected').val()
        if $puzzle_solving or $rna_scoring
          $puzzle_solving.hide()
          $rna_scoring.hide()
          if sel == @Puzzle_solving or sel == @RNA_scoring
            if sel == @Puzzle_solving then $puzzle_solving.show()
            else if sel == @RNA_scoring then $rna_scoring.show()
      $script_type.change(()=>
        if sel = $('#script_type option:selected').val()
          if $puzzle_solving && $rna_scoring
            $puzzle_solving.hide()
            $rna_scoring.hide()
            if sel == @Puzzle_solving then $puzzle_solving.show()
            else if sel == @RNA_scoring then $rna_scoring.show()
        )
  
  clear_inputs : () ->
    if input = @get_inputs()
      input_scripts = input
      for ii in [0..input_scripts.length-1]
        input_script = input_scripts[ii]
        value_id = input_script['name'] + "-value"
        if $input_value = @get_element(value_id)
          $input_value.val('')
  
  initialize_clear : (params) ->
    if $clear_input = @get_element("clear-input")
      $clear_input.click(()=>
        @clear_inputs()
      )
    if $clear_output = @get_element("clear-output")
      $clear_output.click(()=>
        Pervasives.clear()
      )
    
  print_test_puzzle_results : (puzzle, result) ->
    if !(@Lib?)
      @Lib = new Library()
    
    folded = @Lib.fold(result['cause'])
    eval_time = result['eval_time'] / 1000
    
    Pervasives.outln("-- Puzzle title : <a href='/web/puzzle/"+puzzle['nid']+"/'>" + puzzle['title'] + "</a>")
    Pervasives.outln("-- Puzzle creator : " + puzzle['username'])
    Pervasives.outln("Script's Return : " + result['cause'])
    Pervasives.outln("Script's Folded  : " + folded)
    Pervasives.outln("Puzzle secstruct : " + puzzle['secstruct'])
    if folded == puzzle['secstruct'] 
      result = "PASS" 
    else 
      result = "FAIL"
    Pervasives.outln("Result : " +  result)
    Pervasives.outln("Evaluation time : " + eval_time + " sec") 
    return
  
  initialize_test_script_local : (script_type) ->
    puzzle_test_script_local = (nid, cb)=>
      PageData.get_puzzle(nid, (data)=>
        puzzle = data['puzzle']
        if puzzle
          secstruct = puzzle['secstruct']
          input_array = ScriptInterface.set_input_val(@get_inputs(), 0, secstruct)
          input = ScriptInterface.codify_input(input_array)
          @on_evaluate_with_var(input,@editor.getValue(),@get_timeout(), (result) =>
            Pervasives.outln("================ Test on the fly results with puzzle("+nid+").... ================ ")
            @print_test_puzzle_results(puzzle, result)        
          )
        else
          alert "Please check puzzle id.. No puzzles!!"
        if cb
          cb(data)
        )      
    solution_test_script_local = (nid, cb)=>
      Script.get_solution_for_script(nid, (data)=>
        solutions = data['solutions']
        if solutions.length > 0
          for ii in [0..solutions.length-1]
            solution = solutions[ii]
            secstruct = solution['secstruct']
            sequence = solution['sequence']
            input_array = @get_inputs()
            input_array = ScriptInterface.set_input_val(input_array, 0, secstruct)
            input_array = ScriptInterface.set_input_val(input_array, 1, sequence)
            input = ScriptInterface.codify_input(input_array)
            @on_evaluate_with_var(input, @editor.getValue(), @get_timeout(), (result)=>
              Pervasives.outln("================ Test on the fly results with solution("+nid+").... ================ ")
              Pervasives.outln("Solution title : " + solution['title'])
              Pervasives.outln("Solution secstruct : " + solution['secstruct'])
              Pervasives.outln("Solution sequences : " + solution['sequence'])
              Pervasives.outln("Result : " + result['cause'])
              Pervasives.outln("Evaluation time : " + result['eval_time']/1000 + " sec")
              )
        else
          alert "Please check solution id.. No solutions!!"
        if cb
          cb(data)
        )
    common_cb = (data) =>
      if data['puzzle'] || (data['solutions'] && data['solutions'].length > 0) then @scroll_to_result_console()
      Overlay.hide()
    
    initialize_local = ($container, func) =>
      if $test_script_local = $container.find('#test-script-local')
        $test_script_local.click(()=>
          Overlay.set_loading("replying..")
          Overlay.show()
          if $test_script_local_input = $container.find('#test-script-local-input')
            nid = $test_script_local_input.val()
            if !(nid?) || nid == undefined || isNaN(nid)
              alert "Please check id you entered.. Numbers only!!"
              Overlay.hide()
            else  
              Pervasives.clear()
              func(nid,common_cb)
          )
    if $puzzle_solving = @get_element('puzzle-solving')
      initialize_local($puzzle_solving, puzzle_test_script_local)
      if script_type == @Puzzle_solving
        $puzzle_solving.show()
    if $rna_scoring = @get_element("rna-scoring")
      initialize_local($rna_scoring, solution_test_script_local)
      if script_type == @RNA_scoring
        $rna_scoring.show()
    
  scroll_to_result_console : () ->
    position = $('#result').position()
    scroll(0,1000)
    
  initialize_test_script : () ->
    #initialize test tutorials button
    if $test_result = @get_element("test-result")
      $test_result.show()
         
    if $test_script = @get_element("test-script")
      $test_script.show()
      $test_script.click(()=>
        Overlay.set_loading("replying..")
        Overlay.show()
        input = @get_inputs()
        source = @get_source()
        if input && input[0] 
          name = input[0]['value']
        @test_scripts(name, undefined, source, (test)=>
          if $test_result = @get_element("test-result")
            Overlay.hide()
            $test_result.html('')
            @load_test_result(test)
        , (error)=>
          alert "Evaluation server is not available now."
          Overlay.hide()
        )
      ) 
    
  build_script_create : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    @initialize_editor(params['readonly'])
    if params['id']
      @put_script(params['script'], true, true)
      if $update_nid = @get_element("update_nid")
        $update_nid.val(params['id'])
    @initialize_flash()
    @initialize_evaluate()
    @initialize_clear(params)
    @initialize_sample_testsets(params)

    # initialize docs
    if $documentation = @get_element("documentation")
      $documentation.click(()->
        window.open("/web/resources/documentation/script/")
      )
 
    #initialize save button
    if $save_script = @get_element("submit-script")
      $save_script.click(() =>
        if Application.CURRENT_USER
          @save_script()
        else
          alert "Please log in to submit script"
      )
    
    #initialize add input button
    if $add_input = @get_element("add-input")
      if $input_containers = @get_element("input-containers")
        block = Blocks("input-container")
        if params['script']
          input_count = JSON.parse(params['script']['input']).length
        else 
          input_count = 0
        $add_input.click(()=>
          block.add_block($input_containers, {num:input_count, create:true})
          input_count++
        )       

  build_script_show : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    if params['nid']
      params['readonly'] = true
      @initialize_editor(params['readonly'])
      @put_script(params['script'], true, true)
      @put_remove(params['script'], params['nid'])
    @initialize_flash()
    @initialize_evaluate()
    @initialize_clear(params)
    @initialize_sample_testsets(params)
    
    #initialize start button
    if $start_from_copy = @get_element("start-from-copy")
      $start_from_copy.click(() =>
        url_params = {id:params['nid'], type:params['type']}
        url = "/web/script/create/?" + Utils.generate_parameter_string(url_params)
        Utils.redirect_to(url)
      )

  load_script : (id, code, input) ->
    Script.get_script(id, (data) =>
      script = data['script'][0]
      @put_script(script, code, input)
    ) 
 
  
  put_script : (script, code, input) ->
    if code
      @editor.setValue(script['source'])
      $title = @get_element("title")
      $title.html(script['title'])
      $title.val(script['title'])
      if $desc = @get_element("description")
        $desc.val(script['body'])
        
      author = script['author']
      if $author = @get_element("author")
        $author.html(author['name'])
        $author.click(()=>
          url = "/web/player/"+author['uid']+"/"
          Utils.redirect_to(url)
          )
            
    if input
      if script['input'] != null
        input_scripts = @parse_inputs(script['input'])
        if $input_containers = @get_element("input-containers")
          block = Blocks("input-container")
          if input_scripts.length > 0
            for i in [0..input_scripts.length-1]
              input_script = input_scripts[i]
              name = input_script['name']
              value = input_script['value']
              block.add_block($input_containers, {name:name, value:value})
        
    #@load_test_result(script['test'])
    
    if $description = @get_element("description-info")
      if description = script['body']
        $description.html(description)
    
    if $tested_time = @get_element("tested-time")
      if !(script['tested_time']?)
        $tested_time.html("Please wait for test results")
      else
        $tested_time.html(script['tested_time'])
    
    if $type = @get_element("type-info")
      if type = script['type']
        $type.html(type)
      else
        type = "Etc"
        $type.html("Etc")
        
      if type == "Etc" || type == "RNA scoring" || type == "Booster"
          if $see_results = @get_element("see-results")
            $see_results.hide()
          if $tested = @get_element("tested")
            $tested.hide()
        
    if $pageview = @get_element("pageview-info")
      if pageview = script['pageview']
        $pageview.html(pageview)
      else
        $pageview.html("0")
        
  put_remove : (script, nid) ->
    author = script['author']
    if Application.CURRENT_USER?
      user_id = Application.CURRENT_USER['uid']
    else
      user_id = null
    if author['uid'] == user_id
      if $remove_script = @get_element("remove-script")
        $remove_script.html('<span id="remove-button" class="clickable green-button rounded-5" style="clear:both; margin-left:10px; padding:5px; width:100px;">Remove</span>')
        if $remove_button = @get_element("remove-button")
          $remove_button.click(() =>
            Overlay.set_loading("replying..")
            Overlay.show()
            Script.remove_script(nid, (data) =>
              if data['success']
                Overlay.hide()
                url = "/web/script/"
                Utils.redirect_to(url)
            )
          )
      if $edit_script = @get_element("edit-script")
        $edit_script.html('<span id="edit-button" class="clickable green-button rounded-5" style="clear:both; margin-left:10px; padding:5px; width:100px;">Edit</span>')
        if $edit_button = @get_element("edit-button")
          $edit_button.click(() =>
            url_params = {id:nid, type:script['type']}
            url = "/web/script/edit/?" + Utils.generate_parameter_string(url_params)
            Utils.redirect_to(url)
          )
          
  load_test_result : (test_result) ->
    if $test_result = @get_element("test-result")
      if tests = test_result
        block = Blocks("code-test-result")
        for i in [0..tests.length-1]
          test = tests[i]
          test_param = {}
          test_param['puzzle_nid'] = test['nid']
          test_param['puzzle_title'] = test['name']
          test_param['num_cleared'] = if test['num_cleared']? then test['num_cleared'] else 0
          test_param['test_result'] = test['result']
          test_param['test_cause'] = if test['cause'].length > 25 then test['cause'].substring(0,25) + "..." else test['cause']
          test_param['test_time'] = test['eval_time'] / 1000
          block.add_block($test_result, test_param)    

  save_script : () ->
    if $title = @get_element("title")
      if $title.attr('value') == "" 
        alert "You have to write the title!!"
        return
    
    if $description = @get_element("description")
      if $description.attr('value') == ""
        alert " You have to write the description!!"
        return

    nid = null
    if $nid = @get_element("update_nid")
      nid = $nid.attr('value')

    Overlay.set_loading("replying..")
    Overlay.show()
      
    title = $title.attr('value')
    description = $description.attr('value')
    type = $('#script_type option:selected').val()
    input = @get_inputs()
    try
      samples = @get_samples()
    catch Error
      alert "Your sample testsets have an error : " + Error.message
      Overlay.hide()
      return
      
    source = @editor.getValue()
    
    # test script
    if input && input[0] 
      name = input[0]['value']
    
    Script.post_script(nid, title, source, type, input, samples, description, (data) ->
      if !data['success'] || data['nid'] == null || data['nid'] == undefined
        alert "Submit fail. Try again please!!"
      Utils.redirect_to("/web/script/"+data['nid']+"/")
      Overlay.hide()
      )          

  test_scripts : (input, target_info, source, success_cb, fail_cb) ->    
    test = new Array()
    Script.evaluate_script(input, target_info, source, (data)=>
      test_targets = data['data']
      for i in [0..test_targets.length-1] by 1
        test_target = test_targets[i]
        test_result['nid'] = test_target['nid']
        test_result['name'] = test_target['name']
        test_result['result'] = test_target['result']
        test_result['cause'] = test_target['cause']
        test_result['eval_time'] = test_target['eval_time']
        test_result['num_cleared'] = test_target['num_cleared']
        test.push(test_result)
      success_cb(test)  
    , fail_cb)
  
  initialize_editor : (readonly) ->
    #initialize editor
    if $code = @get_element("code")
      @editor = CodeMirror.fromTextArea($code.get(0), {
        lineNumbers:true,
        matchBrackets:true,
        extraKeys:{"Enter": "newlineAndIndentContinueComment"},
        readOnly:readonly
        })     
      @editor.setSize("97%", 600)
      if readonly 
        wrapper = @editor.getWrapperElement()
        $(wrapper).css('background-color','#BDBDBD')    
 
  initialize_flash : () ->
    #initialize flash
    flashvars = {}
    flash_params =  {allowScriptAccesss: "always"}
    attributes = {id: "viennalib"};
    swfobject.embedSWF("/eterna_resources/scriptfold.swf", "viennalib", "0", "0", "9.0.0", false, flashvars, flash_params, attributes);

  initialize_evaluate : () ->
    $input = @get_element("input")
    $code = @get_element("code")
    if $evaluation = @get_element("evaluation")
      $evaluation.click(()=>
        Pervasives.clear()
        @on_evaluate()
      )      
    
  
  on_evaluate : () ->
    input_array = @get_inputs_with_value()
    param = ScriptInterface.codify_input(input_array)
    code = @editor.getValue()
    timeout = @get_timeout()
    @on_evaluate_with_var(param,code,timeout)
 
  on_evaluate_with_var : (input, code, timeout_sec, cb) ->   
    code = ScriptInterface.insert_timeout(code, timeout_sec)
    #dynamic linking libraries
    @dynamic_load(code, ()=>
      result = ScriptInterface.evaluate(input+code)
      if cb
        cb(result)
      else
        Pervasives.outln("<br>Return : " + result['cause'])
        Pervasives.outln("Evaluation time : " + result['eval_time']/1000 + " sec")
      )

  get_timeout : () ->
    #default timeout 10sec
    timeout_sec = 10
    if $timeout_sec = @get_element("timeout")
      value = $timeout_sec.attr('value')
      if value != "" then timeout_sec = value
    return timeout_sec    

  dynamic_load : (code, cb) ->
    if !(@loader?)
      @loader = new LibLoader()
    if Overlay?
      Overlay.set_loading("replying..")
      Overlay.show()
    Pervasives.outln("Library Loader use.... " + @loader.getUse())
    @loader.parse(code, (libs) =>
      @loader.dynamicLoad(libs,(lib) =>
          if lib
            Pervasives.outln(@loader.getName(lib) + " loading.... ")
        , (state)=>
            Pervasives.outln(@loader.getNameFromState(state) + " loading " + @loader.getSuccessFromState(state))
        , (states)=>
          if Overlay?
            Overlay.hide()
          cb()
        )
      )
  resetTimeValue : () ->
    @setTimeValue(0,0,0)
    
  setTimeValue : (hour, min, sec) ->
    if $hour = @get_element("timer-hour") then $hour.html(@format(hour))
    if $min = @get_element("timer-min") then $min.html(@format(min))
    if $sec = @get_element("timer-sec") then $sec.html(@format(sec))

  format : (num) ->
    return if parseInt(num) < 10 then String("0" + num) else String(num) 

  parse_inputs : (input) ->
    try
      input_scripts = JSON.parse(input)
    catch Error
      input_scripts = [{name:"name0", value:input}]
    return input_scripts

  get_inputs : () ->
    if $input_form = @get_element("input-form")
      arr = $input_form.serializeArray()
      if arr.length > 0
        result = new Array
        for i in [0..arr.length-1]
          input = arr[i]
          if input['value'] != ""
            result.push(input)
        return result
    return []

  get_inputs_with_value : () ->
    input_array = @get_inputs()
    if input_array.length > 0
      for ii in [0..input_array.length-1]
        $name = @get_element(input_array[ii]['name'])
        value = input_array[ii]['name']+"-value"
        $value = @get_element(value)
        v = $value.attr('value').replace(/\n/gi, '\\n')
        input_array = ScriptInterface.set_input_val(input_array, ii, v)
    return input_array

  get_source : () ->
    if @editor
      return @editor.getValue()
    return ""

  put_source : (src) ->
    if @editor
      @editor.setValue(src)

  get_samples : () ->
    if $sample_testsets_form = @get_element("sample-testsets-form")
      arr = $sample_testsets_form.serializeArray()
      if arr.length > 0
        result = new Array
        for i in [0..arr.length-1]
          input = arr[i]
          if input['value'] != ""
            result.push(JSON.parse(input['value']))
        return result
    return []
            
class @BuilderInput extends Builder
  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    if $delete = @get_element("delete")
      $delete.click(()->
        $container.html("")          
        )


class @BuilderScriptTestResultPage extends Builder
  on_build : (block, $container, params) ->
    @size = 20
    @before_skip = @size
    @after_skip = @size
    
    if !params['nid']?
      return
    
    if !params['sort']?
      params['sort'] = "date" 
    
    param_string = {}
    param_string.search = params['search']
    param_string.pass = if params['pass'] then params['pass'] else undefined
    param_string.fail = if params['fail'] then params['fail'] else undefined
    param_string.timeout = if params['timeout'] then params['timeout'] else undefined
    
    param_string.sort = "date"
    params['date_sort_url'] = "/web/script/test/"+params['nid']+"/?" + Utils.generate_parameter_string(param_string)

    param_string.sort = "time"
    params['time_sort_url'] = "/web/script/test/"+params['nid']+"/?" + Utils.generate_parameter_string(param_string)

    param_string.sort = params['sort']
      
    ThemeCompiler.compile_block(block,params,$container)
    @generate_testresult(params['nid'], param_string)
    
    if $pass = @get_element("pass")
      if params['pass'] == "true" then $pass.attr("checked", true)

      $pass.click(()=>
         if params['pass']!="true" then param_string.pass="true" else param_string.pass=undefined
         url = "/web/script/test/"+params['nid']+"/?" + Utils.generate_parameter_string(param_string)
         Utils.redirect_to(url)
      )

    if $fail = @get_element("fail")
      if params['fail'] == "true" then $fail.attr("checked", true)

      $fail.click(()=>
         if params['fail']!="true" then param_string.fail="true" else param_string.fail=undefined
         url = "/web/script/test/"+params['nid']+"/?" + Utils.generate_parameter_string(param_string)
         Utils.redirect_to(url)
      )
      
    if $timeout = @get_element("timeout")
      if params['timeout'] == "true" then $timeout.attr("checked", true)

      $timeout.click(()=>
         if params['timeout']!="true" then param_string.timeout="true" else param_string.timeout=undefined
         url = "/web/script/test/"+params['nid']+"/?" + Utils.generate_parameter_string(param_string)
         Utils.redirect_to(url)
      )
    
    if $before_result_more = @get_element("before-result-more")
      $before_result_more.click(() =>
        @request_test_result_before(params['nid'], @before_skip, @size, param_string)
        @before_skip += @size
        )
    if $after_result_more = @get_element("after-result-more")
      $after_result_more.click(() =>
        @request_test_result_after(params['nid'], @after_skip, @size, param_string)

        @after_skip += @size
        )
 
  show_record : ($container, success, fail) ->
    block = Blocks("block-test-record")
    record = []
    record['total'] = success+fail
    if isNaN(record['total'])
      record['total'] = 0
    record['success'] = success
    if isNaN(record['success'])
      record['success'] = 0
    record['fail'] = fail
    if isNaN(record['fail'])
      record['fail'] = 0
    if record['total'] > 0
      record['rate'] = (record['success'] / record['total'] * 100).toFixed(2)
    else
      record['rate'] = 0
    block.add_block($container, record)  
    
  generate_testresult : (script_nid, params) ->
    $bloading = @get_element("before-loading")
    $bloading.show()
    $aloading = @get_element("after-loading")
    $aloading.show()
   
    Script.get_script_with_test(script_nid, @skip ,@size, params, (data) =>
      @skip += @size
      script = data['script'][0]
      
      if $tested_time = @get_element("tested-time")
        if !(script['tested_time']?)
          $tested_time.html("Please wait for test results")
        else
          $tested_time.html(script['tested_time'])
      @initialize_table_header(script['type'])    
      test = script['test']
      if test
        before = test['before']
        after = test['after']
        if script['type'] == "Puzzle solving"
          if $record = @get_element("record")
            @show_record($record, test['before']['success']+test['after']['success'], test['before']['fail'] + test['after']['fail'])
          if $record_before = @get_element("record-before")
            @show_record($record_before, test['before']['success'], test['before']['fail'])
          if $record_after = @get_element("record-after")
            @show_record($record_after, test['after']['success'], test['after']['fail'])
        @load_test_result(before['test'], after['test'])

      $bloading.hide()
      $aloading.hide()
  
      )
  initialize_table_header : (type) ->
    if $test_result_table_header = @get_element("test-result-table-header")
      block = Blocks("table-header-block")
      block.add_block($test_result_table_header, {type:type})
        
  load_test_result : (before, after) ->
    if $test_result_before = @get_element("test-result-before")
      @load_test_result_with_container($test_result_before, before)
    if $test_result_after = @get_element("test-result-after")
      @load_test_result_with_container($test_result_after, after)
  
  request_test_result_before : (nid, skip, size, options) ->
    $loading = @get_element("before-loading")
    $loading.show()
    Script.get_script_with_test(nid, skip, size, options, (data)=>
      script = data['script'][0]
      if $test_result_before = @get_element("test-result-before")
        @load_test_result_with_container($test_result_before, script['test']['before']['test'])
      $loading.hide()
      )
  
  request_test_result_after : (nid, skip, size, options) ->
    $loading = @get_element("after-loading")
    $loading.show()
    Script.get_script_with_test(nid, skip, size, options, (data)=>
      script = data['script'][0]
      if $test_result_after = @get_element("test-result-after")
        @load_test_result_with_container($test_result_after, script['test']['after']['test'])
      $loading.hide()
      )
  
  load_test_result_with_container : ($container, result) ->
    if $container
      if result.length > 0
        @load_test_result_packer($container, result)
      else
        $container.find('#noresult').show()
     

  load_test_result_packer : ($test_result, testresults) ->
    block = Blocks("test-result-block")
    test_result_params = []
    for test in testresults
      test_param = {}
      if test['puzzle_nid']
        # rna scoring
        puzzle_nid = test['puzzle_nid']
        solution_nid = test['nid']
        test_param['type'] = "RNA scoring"
        test_param['nid'] = puzzle_nid
        test_param['score'] = Number(test['cause'])
        if isNaN(test_param['score'])
          test_param['score'] = "Not a Number"
        test_param['target_url'] = "/game/browse/"+puzzle_nid+"/?filter1=Id&filter1_arg1="+solution_nid+"&filter1_arg2="+solution_nid
      else
        #puzzle solving
        test_param['type'] = "Puzzle solving"
        test_param['nid'] = test['nid']
        test_param['target_url'] = "/web/puzzle/"+test_param['nid']+"/"
        
      test_param['puzzle_nid'] = test['nid']
      test_param['puzzle_title'] = test['name']
      
      test_param['num_cleared'] = if test['num_cleared']? then test['num_cleared'] else 0
      test_param['test_result'] = test['result']
      test_param['test_cause'] = test['cause']
      test_param['test_time'] = test['eval_time'] / 1000
      test_result_params.push(test_param)
      block.add_block($test_result, test_param)
      do (test_param) =>
        if $show_sequence = @get_element(test_param['puzzle_nid']+'_show_sequence')
          if $test_cause = @get_element(test_param['puzzle_nid']+'_test_cause')
            $test_cause.hide()
            $show_sequence.click(()=>
              $show_sequence.hide()
              $test_cause.show()
            )
