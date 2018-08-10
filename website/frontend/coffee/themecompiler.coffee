@ThemeCompiler = {
  
  BLOCK_ID_COUNTER : 0
  BLOCK_ID_PREFIX : "_pbid-"
  
  get_attrs : (str) ->
    val = new Object()
    
    str.replace(/\s*([a-zA-Z0-9]+)\s*=\s*"([^"]+)"/gi, (m,key,value) ->
      val[key.toLowerCase()] = value    
    )
    
    return val
  
  get_attr_value : (str) ->
    val = new Object()
    
    str.replace(/\s*([^:]+)\s*:\s*([^;]+)\s*;?/g, (m,key,value) ->
      val[key.toLowerCase()] = value
    )
  
    return val

  get_attr_value_string : (obj) ->
  
    if !(obj?)
      return ""
    
    strs = new Array()  
    for own key,val of obj
      strs.push(key)
      strs.push(":")
      strs.push(val)
      strs.push(";")
    
    return strs.join('')
  
  get_tag_header : (tag, attrs_obj) ->
    rephrase = new Array()
    rephrase.push("<", tag," ")
    for own key,val of attrs_obj
      if val?
        rephrase.push(key,"=\"",val,"\" ")
    rephrase.push(">")
    full_phrase = rephrase.join('')  
    return full_phrase

  compile_block : (block, contents, $container) ->

    if !block
      Utils.display_error("NULL block in compile_block")
      return null

    if !$container
      Utils.display_error("Null or invalid JElement in ThemeCompiler.compile " + theme)
      return null    
                
    template = block.template_string_
    
    if !template
      Utils.display_error("Block template doesn't exist")
      return null

    context_variables = block.template_context_variables_
    
    if !(context_variables?)
      match = template.match(/({.+?})|(<.+?>)|([^\s{}<>][^{}<>]*)/gi)
      context_variables = new Array()
      
      if match
        for ii in [0..match.length-1] by 1
          phrase = match[ii]
          phrase_match = null
      
          if phrase_match = (/^{(.+)}$/i).exec(phrase)
          
            if_match = null
            for_match = null
                        
            if if_match = (/\s*IF\s+(.+)/).exec(phrase_match[1])
              exp = if_match[1]
              @get_free_variables(exp,context_variables)
            
            else if for_match = (/\s*FOR\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+):([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\s*/).exec(phrase_match[1])
              
              @get_free_variables(for_match[2], context_variables)
              @get_free_variables(for_match[3], context_variables)
              @get_free_variables(for_match[4], context_variables)
        
      else
        match = new Array()
                    
      block.template_context_variables_= context_variables                                   
      block.template_tokens_ = match
    
    cache_key = ""
  
    compile_context = null
    
    if contents? 
      compile_context = new Object()
      
      for ii in [0..context_variables.length-1] by 1
        compile_context[context_variables[ii]] = contents[context_variables[ii]]
      
      cache_key = Utils.generate_parameter_string(compile_context)


    dom_stack = new Array()
    program_stack = new Array()
    skip = false
    skip_trigger = null
    
    compiled_cache = block.template_compiled_cache_[cache_key]
    
    if !(compiled_cache?)

      compiled_tokens = new Array()
      compiled_need_evaluations = new Array()
      compiled_is_blocks = new Array()
      
      if !contents
        contents = new Object()
        compile_context = new Object()
      else
        if !compile_context
          Utils.display_error("Compile context is null!")
          return null
      
      match = block.template_tokens_
      
      if !(match?)
        Utils.display_error("Can't find theme parses")
        return null
      
      for ii in [0..match.length-1] by 1
        phrase = match[ii]
        phrase_match = null
                  
        parent = dom_stack.last()
              
        if phrase_match = (/^{(.+)}$/i).exec(phrase)
        
          if_match = null
          else_match = null
          for_match = null
          if_end_match = null
          for_end_match = null
                      
          if if_match = (/\s*IF\s+(.+)/).exec(phrase_match[1])
            
            exp = if_match[1]

            program_block = new Object()
            program_block['blockname'] = "IF"
            program_block['is_true'] = true
            program_stack.push(program_block)

            if_evaluation = @evaluate(exp,compile_context)
            if !if_evaluation || if_evaluation == "false"
              program_block['is_true'] = false
              if skip_trigger == null
                skip_trigger = program_block
                
          else if else_match = (/\s*ELSE\s*/).exec(phrase_match[1])
          
            last_block = program_stack.last()
            
            if last_block['blockname'] != "IF"
              Utils.display_error("Block mismatch " + pop_block['blockname'] + " & ELSE")
              return null
            
            if last_block['is_true'] == false
              if skip_trigger == last_block
                skip_trigger = null
              else if !skip_trigger
                Utils.display_error("IF evaluation and skip trigger doesn't match")
                return null
            else
              if !skip_trigger
                skip_trigger = last_block

          else if if_end_match = (/\s*ENDIF\s*/).exec(phrase_match[1])
            if program_stack.length < 1
              Utils.display_error("Unmatched {ENDIF}")
              return null
            
            pop_block = program_stack.pop()
            if pop_block['blockname'] != "IF"
              Utils.display_error("Block mismatch " + pop_block['blockname'] + " & IF");
              return null

            if pop_block == skip_trigger
              skip_trigger = null
            
          else if for_match = (/\s*FOR\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+):([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\s*/).exec(phrase_match[1])
                          
            program_block = new Object()
            program_block['blockname'] = "FOR"
            program_block['entry_point'] = ii
            program_block['variable'] = for_match[1]
            program_block['end_condition'] = for_match[3]
            program_block['step_size'] = @evaluate(for_match[4],compile_context)
 
            if Utils.is_int(program_block['step_size']) != true
              Utils.display_error("Theme warning : FOR step_size is not integer. Defaulting to 1")
              program_block['step_size'] = 1
            
            @assign_in_context(program_block['variable'], @evaluate(for_match[2], compile_context), compile_context)

            init_i = @evaluate(program_block['variable'],compile_context)
            end_i = @evaluate(program_block['end_condition'],compile_context)
            
            if Utils.is_int(init_i) != true
              Utils.display_error("Theme Warning : init_i " + init_i + " could not be evaluated")
              init_i = null
            
            if Utils.is_int(end_i) != true
              Utils.display_error("Theme Warning : end_i " + program_block['end_condition'] + " could not be evaluated")
              end_i = null
            
            if Utils.equals_null(init_i) || Utils.equals_null(end_i) || init_i >= end_i
              if !skip_trigger
                skip_trigger = program_block
            
            program_stack.push(program_block)
            
          else if for_end_match = (/\s*ENDFOR\s*/).exec(phrase_match[1])
            
            last_block = program_stack.last()
            
            if last_block['blockname'] != "FOR"
              Utils.display_error("Block mismatch " + last_block['blockname'] + " & FOR");
              return null
            
            @assign_in_context(last_block['variable'], @evaluate(last_block['variable'], compile_context) + last_block['step_size'], compile_context)
            
            init_i = @evaluate(last_block['variable'], compile_context)
            end_i = @evaluate(last_block['end_condition'], compile_context)
            
            if Utils.is_int(init_i) != true
              Utils.display_error("Warning : init_i " + init_i + " could not be evaluated")
              init_i = null
            
            if Utils.is_int(end_i) != true
              Utils.display_error("Warning : end_i " + end_i + " could not be evaluated")
              end_i = null
            
            if Utils.equals_null(init_i) || Utils.equals_null(end_i) || init_i >= end_i
              program_stack.pop()
              
              if last_block == skip_trigger
                skip_trigger = null
            else
              ii = last_block['entry_point']
            
          else
        
            if skip_trigger != null
              continue
        
            key = phrase_match[1]
            
            evaluation = @evaluate(key,compile_context)
                        
            if evaluation?
              compiled_tokens.push(evaluation)
              compiled_need_evaluations.push(false)
              compiled_is_blocks.push(false)
            else
              compiled_tokens.push(phrase_match[0])
              compiled_need_evaluations.push(true)
              compiled_is_blocks.push(false)

        else if phrase_match = (/^<([\/a-zA-Z0-9:\-]+).*>$/i).exec(phrase)

          if skip_trigger
            continue
          
          if phrase_match[1].charAt(0) == "/"
            
            if dom_stack.length == 0
              Utils.display_error("Unbalanced tag closing : closing on empty dom stack")
              continue
            
            last_tag = dom_stack.pop()
            tag_closer = phrase_match[1].substring(1).toLowerCase()
            if last_tag? && last_tag != tag_closer
              Utils.display_error("Unbalanced tag openings/closings : " + last_tag  + " expected but was " + tag_closer)
              return
            
            if tag_closer == "block"
              continue
              
            compiled_tokens.push(phrase_match[0])
            compiled_need_evaluations.push(false)
            compiled_is_blocks.push(false)
          
          else

            full_phrase = phrase_match[0]
            tag = phrase_match[1].toLowerCase()
            is_block = false
                                                
            if tag == "block"
              is_block = true
              attrs_obj = @get_attrs(phrase_match[0])
              
              if block_name = attrs_obj['name']
                block_object = BlockManager.get_block(block_name)
              
                if !block_object
                  Utils.display_error("Can't find a block " + block_name)
                  continue
              
                block_default_attrs = block_object.get_default_attrs()
                for own key,val of block_default_attrs
                  if !(attrs_obj[key]?)
                    attrs_obj[key] = val
                  else
                    lowercasekey = key.toLowerCase()
                    if lowercasekey.toLowerCase() == "style"
                      default_style = @get_attr_value(val)
                      if default_style?
                        instance_style = @get_attr_value(attrs_obj[key])
                  
                        for own stylekey,styleval of instance_style
                          default_style[stylekey] = styleval
                        
                        attrs_obj[key] = @get_attr_value_string(default_style)    
                    else if lowercasekey.toLowerCase() == "class"
                      attrs_obj[key] = val + " " + attrs_obj[key]
                      
                full_phrase = @get_tag_header(tag,attrs_obj)

            full_phrase = @evaluate_safe(full_phrase, compile_context)
            attrs_obj = @get_attrs(full_phrase)
            need_rephrase = false
            
            if id = attrs_obj['id']
              if id.indexOf(@BLOCK_ID_PREFIX) >= 0
                Utils.display_error("You cannot use html ID with prefix " + @BLOCK_ID_PREFIX +". Prefixing '_'")
                attrs_obj['id'] = "_" + attrs_obj['id']
                need_rephrase = true
            
            ## JEEFIX - REALLY???
            if tag == "a" && attrs_obj['transition']?
              transition = attrs_obj['transition']
              if transition == "overlay"
                if !(@transition_overlay_cb_id_?)
                  @transition_overlay_cb_id_ = CallbackManager.register_callback((e, href) ->
                    $e = $.Event(e)
                    $e.preventDefault()
                    href = Utils.to_uri(String(href))
                    Page.transit(href, true)
                  )
                attrs_obj["onClick"] = "CallbackManager.get_callback(" + @transition_overlay_cb_id_ + ")(event,this)"
                need_rephrase = true
              else if transition == "page"
                if !(@transition_page_cb_id_?)
                  @transition_page_cb_id_ = CallbackManager.register_callback((e, href) ->
                    $e = $.Event(e)
                    $e.preventDefault()
                    href = Utils.to_uri(String(href))
                    Page.transit(href, false)
                  )      
                attrs_obj["onClick"] = "CallbackManager.get_callback(" + @transition_page_cb_id_ + ")(event,this)"
                need_rephrase = true              
            
            if need_rephrase
              full_phrase = @get_tag_header(tag, attrs_obj)
            
            dom_stack.push(tag)
            
            compiled_tokens.push(full_phrase)  
            compiled_need_evaluations.push(@need_evaluation(full_phrase))
            compiled_is_blocks.push(is_block)
            
        else
          
          if skip_trigger
            continue
          
          compiled_tokens.push(phrase)
          compiled_need_evaluations.push(false)
          compiled_is_blocks.push(false)
      
      block.template_compiled_cache_[cache_key] = compiled_cache = {tokens:compiled_tokens, need_evaluations:compiled_need_evaluations, is_blocks:compiled_is_blocks}
      
    final_tokens = new Array()
    tokens = compiled_cache.tokens
    need_evaluations = compiled_cache.need_evaluations
    is_blocks = compiled_cache.is_blocks
    
    blocks = new Array()
    
    # Pack with contents
    for ii in [0..tokens.length-1] by 1
      if is_blocks[ii]
        if need_evaluations[ii]
          block_attrs = @get_attrs(tokens[ii])
          for own key, value of block_attrs
            if key == "input"
              block_inputs = @get_attr_value(value)
              block_attrs[key] = @evaluate_object(block_inputs, contents)               
            else                                                             
              block_attrs[key] = @evaluate_safe(value,contents)
        else
          phrase = tokens[ii]
          block_attrs = @get_attrs(phrase)
                     
        block_id = block_attrs['id']
        block_tag = block_attrs['tag']
        block_name = block_attrs['name']
        block_builder = block_attrs['builder']
        block_inputs = block_attrs['input']
        
        if (block_inputs?) && typeof block_inputs == "string"
          block_inputs = @get_attr_value(block_inputs)
        
        if !(block_tag?)
          block_tag = "div" 
        
        if !(block_id?)
          block_attrs['id'] = block_id = @BLOCK_ID_PREFIX + @BLOCK_ID_COUNTER
          @BLOCK_ID_COUNTER++
        
        final_tokens.push("<")
        final_tokens.push(block_tag)
        final_tokens.push(" ")
        for own key,val of block_attrs
          final_tokens.push(key)
          final_tokens.push("=\"")
          final_tokens.push(val)
          final_tokens.push("\" ")
        final_tokens.push(">")
        final_tokens.push("</")
        final_tokens.push(block_tag)
        final_tokens.push(">")
          
        blocks.push({id:block_id,name:block_name,builder:block_builder, input:block_inputs})
        
      else  
        if need_evaluations[ii]
          final_tokens.push(@evaluate_safe(tokens[ii], contents))
        else
          final_tokens.push(tokens[ii]) 
   
    $container.append(final_tokens.join(''))
    
    # Build children blocks
    for block in blocks
      block_id = block.id
      $block_container = $container.find("#" + block_id)
      if $block_container.exists()
        block_class = Blocks(block.name)
        if !(block_class?)
          Utils.display_error("COMPILE ERROR : can't find a block class " + block.name)
        block_class.build($block_container, block.input)
      else
        Utils.display_error("COMPILE ERROR : can't find a block container " + block_id)

  
  # Assume name is a variable/value
  # If it is a string, it is within "" or ''
  evaluate : (name,context) ->

    number_match = null
    compare_match = null
    string_match = null
    array_match = null
    wrongname_match = null
    name_match = null
        
    # In case this is a number
    if number_match = (/^\s*(\d+)\s*$/).exec(name)
      return parseInt(number_match[1])
    
    if string_match = (/^'([^']*)'$/).exec(name)
      return string_match[1]
    
    if string_match = (/^"([^"]*)"$/).exec(name)
      return string_match[1]
        
    # In case this is just a variable name
    if name_match = (/^[A-Z0-9a-z_]+$/).exec(name)

      translation = context[name]
      if translation?
        return translation
      else
        return null
    else if compare_match = (/^([^=]*[^\s=])\s*==\s*([^=]*[^=\s])\s*$/.exec(name))
      
      lhs = @evaluate(compare_match[1], context)
      rhs = @evaluate(compare_match[2], context)
      
      return lhs == rhs
    
    else if array_match = (/^([A-Za-z0-9_]+)\[([^\]]+)\]$/).exec(name)
      
      array_name = array_match[1]
      index_name = array_match[2]

      index = @evaluate(index_name, context)
      
      if Utils.is_int(index) != true
        return null
      
      array = context[array_name]  
      
      # JEEFIX : Hack..? Do I use JContent here? Not a problem practically, but very ugly.
      if typeof(array) != "object"
        return "{" + array_name + "[" + index + "]" + "}"

      return array[index]

    else if object_match = (/^([A-Za-z0-9_]+)\.(.+)$/).exec(name)
      object_name = object_match[1]
      
      if object_name == "STRING"
        if string_op_match = (/^([A-Za-z]+)\((.+)\)$/).exec(object_match[2])
          if string_op_match[1] == "replace"
            if (arg_match = (/^([A-Za-z0-9_]+)\s*,\s*(.+)\s*,\s*['"](.+)['"]$/).exec(string_op_match[2])) and arg_match.length == 4
              if string_name = @evaluate(arg_match[1], context)
                if reg_match = (/^\/([^\/])\/([igm]*)$/).exec(arg_match[2])
                  return string_name.replace(new RegExp(reg_match[1], reg_match[2]), arg_match[3])
                else
                  return string_name.replace(arg_match[2].replace(/['"]/g, ""), arg_match[3])
        return null
      else
        property_name = object_match[2]
        object = @evaluate(object_name,context)
        if object?
          return object[property_name]
      
      return null

    return null
  
  # Only evaluate when the target is surrounded by {}    
  evaluate_safe : (name, context) ->
    if typeof name != "string"
      return name
    
    ret_obj = null
    name_len = name.length
    
    evaluated_string = name.replace(/{([^}]*)}/g, (m,value) =>
      evaluated = @evaluate(value,context)  
       
      if evaluated?
        if typeof evaluated == "object"
          if name_len == value.length + 2
            ret_obj = evaluated
          else
            return "Object"
        return evaluated
      return m  
    )
    
    if ret_obj?
      return ret_obj
    
    return evaluated_string

  evaluate_object : (obj, context) ->
    if obj?
      for own key,val of obj
        if typeof val == "object"
          @evaluate_object(val,context)
        else
          evaluated = @evaluate_safe(val,context)
          if evaluated?
            obj[key] = evaluated 
      return obj
    
  need_evaluation : (str) ->
    if (/{[^}]*}/).exec(str)
      return true
    return false

  assign_in_context : (name,value,context) ->
    context[name] = value    

  get_free_variables : (name, variables) ->
    
    number_match = null
    compare_match = null
    string_match = null
    array_match = null
    wrongname_match = null
    name_match = null
    
    # In case this is a number
    if number_match = (/^\s*(\d+)\s*$/).exec(name)
      return
    
    if string_match = (/^'([^'}]*)'$/).exec(name)
      return
    
    if string_match = (/^"([^"}]*)"$/).exec(name)
      return
    
    # In case this is just a variable name
    if name_match = (/^[A-Z0-9a-z_]+$/).exec(name)
      variables.push(name)
      return
    else if compare_match = (/^([^=]*[^\s=])\s*==\s*([^=]*[^=\s])\s*$/.exec(name))

      @get_free_variables(compare_match[1], variables)
      @get_free_variables(compare_match[2], variables)
      return
    
    else if array_match = (/^([A-Za-z0-9_]+)\[([^\]]+)\]$/).exec(name)
      array_name = array_match[1]
      index_name = array_match[2]
      variables.push(array_name)
      variables.push(index_name)
      return
    
    else if object_match = (/^([A-Za-z0-9_]+)\.(.+)$/).exec(name)
      object_name = object_match[1]
      if object_name == "STRING"
        if string_op_match = (/^([A-Za-z]+)\((.+)\)$/).exec(object_match[2])
          if string_op_match[1] == "replace"
            if (arg_match = (/^([A-Za-z0-9_]+)\s*,\s*(.+)\s*,\s*['"](.+)['"]$/).exec(string_op_match[2])) and arg_match.length == 4
              variables.push(arg_match[1])
      else
        variables.push(object_name)
      return
    
    else if wrongname_match = (/^[^}]+$/).exec(name)
      Utils.display_error("Wrong variable name " + wrongname_match)
      return null
        
    # In case this is a string + variable name
    return name.replace(/{([^}]*)}/g, (m,variable) =>
      variables.push(@get_free_variables(variable,variables))
    )

}
