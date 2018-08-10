class @Library 
  constructor : () ->
    # default bases sequence
    @bases = 'AGCU'
    @webworker = false
    


  initialize_flash : (embed = false) ->

    if $('object#viennalib').length > 0 
      return true
     
    if embed? and embed is true
      viennalib = document.createElement('object')
      viennalib.setAttribute('id', 'viennalib')
      document.body.appendChild(viennalib)
      
      #initialize flash
      flashvars = {}
      flash_params = {allowScriptAccesss: "always"}
      attributes = {id: "viennalib"}
      swfobject.embedSWF("/eterna_resources/scriptfold.swf", "viennalib", "0", "0", "9.0.0", false, flashvars, flash_params, attributes)

    return setTimeout(@initialize_flash, 100) 
      

  # fold
  fold : (seq) ->
    if $applet = document.getElementById('maingame')
      return $applet.fold(seq)
    return document.getElementById('viennalib').fold(seq)
    

  energyOfStruct : (sequence, structure) ->
    if $applet = document.getElementById('maingame')
      return $applet.energy_of_structure(sequence, structure)
    return document.getElementById('viennalib').energyOFStruct(sequence, structure);


  # replace character
  # ex) replace("AAAA", 2, "B") = "AABA"  
  replace : (seq, index, to) ->
    if(typeof(seq) == "string")
      return seq.substring(0, index) + to + seq.substring(index+1, seq.length) 
    if(typeof(seq) == "object")
      seq[index] = to
      return seq
  
  # return next sequence by default bases sequence
  # ex) next("AAAA") = "AAAG"
  nextSequence : (seq) ->
    return @nextSequenceWithBases(seq, @bases)
      
  nextSequenceWithBases : (seq, bases) ->
    replace_ = @replace    
    next_ = (seq, index) ->
      if seq[index] == bases[3]
        next_(replace_(seq, index, bases[0]), ++index)
      else
        return replace_(seq, index, bases[bases.indexOf(seq[index]) + 1])    
    return next_(seq,0)

  random : (from, to) ->
    return Math.floor( (Math.random() * (to - from + 1)) + from )
  
  randomSequence : (size) ->
    return @randomSequenceWithBases size, @bases
    
  randomSequenceWithBases : (size, bases) ->
    sequence = ""
    for i in [0..size-1]
      sequence += bases[@random(0, bases.length-1)]
    return sequence

  map : (fn, sequence) ->
    for i in [0..sequence.length-1]
      (fn sequence[i],i)
    
  filter : (fn, sequence) ->
    result = ""
    for i in [0..sequence.length-1]
       if (fn sequence[i]) then result += sequence[i]
    return result
    
  splitDefault : (structure) ->
    result = new Array
    item = structure[0]
    index = 0
    for i in [0..structure.length]
      if item != structure[i] || i == structure.length
        item = structure[i]
        result.push structure.substring(index, i)
        index = i
    return result

  join : (array) ->
    result = ""
    for item in array
      result += item
    return result

  set : (fn, structure) ->
    array = @split structure
    @map (item, index) =>
      (fn array, item, index)
    , array
    return array

  distance : (source, destination) ->
    return @distanceCustom (index) =>
      return if source[index] == destination[index] then 0 else 1 
    , source, destination
    
  distanceCustom : (fn, source, destination) ->
    if source.length == destination.length
      sum = 0
      @map (_, index) =>
        sum += (fn index)
      , source
      return sum
    return -1

  getStructure : (nid) ->
    data = AjaxManager.querySync("GET", Application.GET_URI, {type:"puzzle",nid:nid})
    data = data['data']
    if data && data['puzzle'] && data['puzzle']['secstruct']
      return data['puzzle']['secstruct']  
    else
      throw new RNAException("Puzzle not found!!")
    
        
  getStructureWithAsync : (nid, success_cb) ->
    PageData.get_puzzle(nid, (data)->
      (success_cb data['puzzle']['secstruct'])
      )


  EternaScript : (id, secure) ->
    return eval(@EternaScriptSource(id, secure))

  EternaScriptSource : (id, secure = null) ->
    data = Script.get_script_sync(id).data
    script = data['script'][0]
    code = ""

    if secure? and secure is true
      user_id = data['current_uid']
      status = "Access Denied:"
      if !(user_id?)
        status += " Must be logged in to execute scripts!"
        alert(status)
        return code
      if user_id != script['uid']
        status += " We can only execute scripts you have authored..."
        status += " try making a copy!"
        alert(status)
        return code

    # for multiple input implementation
    if script['input']
      inputs = JSON.parse(script['input'])
      for i in [0..(inputs.length - 1)]
        input = inputs[i]
        code += "var "+input['value']+"=arguments["+i+"];"
    code = "function _"+id+"(){Lib = new Library();"+code+script['source']+"};_"+id
    return code

  ### grab datas wrapper ###

  getUsers : (skip, size) ->
    users = PageData.get_players_with_info_sync(skip,size)
    return users['data']['users']
  
  getPuzzles : (params) ->
    return Script.get_puzzles_for_script_library(params)['data']['puzzles']  
  
  getPuzzlesAsync : (params, success_cb) ->
    Script.get_puzzles_for_script_library_async(params, (data)=>
      success_cb(data)
      )
      
  ### grab datas wrapper ###  

class @RNAElement
  @Loop = "loop"
  @Stack = "stack"
  
  @Hairpin = "Hairpin"
  @Bulge = "Bulge"
  @Internal = "Internal"
  @Multiloop = "Multiloop"
  @Dangling = "Dangling"
    
  constructor : (index, _structure) ->
    @parent = null
    @childs = new Array
    @elements = new Array
    @segment_count = 1
    @type = null
    @base_type = null 
    # @add(index, _structure)

  add : (_index, _structure) ->
    _pair = undefined
    elements = @getElements()
    if elements.length > 0
      if _structure == "." && Math.abs(elements[elements.length-1]['index']-_index) > 1 
        @setSegmentCount(@getSegmentCount()+1)
      if _structure == ")"
        for i in [elements.length-1..0] by -1
          if elements[i]['pair'] == undefined
            elements[i]['pair'] = _index
            _pair = elements[i]['index']
            break
    @getElements().push({index:_index, structure:_structure, pair:_pair})  
  
  addChild : (node) ->
    node.parent = this
    @childs.push(node)

  getChilds : () ->
    return @childs

  getParent : () ->
    return @parent

  getElements : () ->
    return @elements

  isPaired : () ->
    temp = new Array
    elements = @getElements()
    for i in [0..elements.length-1]
      if elements[i]['structure'] == "(" then temp.push(i)
      else if elements[i]['structure'] == ")" then temp.pop()
      
    return temp.length == 0 
        
  setType : (type) ->
    @type = type
  getType : (type) ->
    return @type  

  setBaseType : (type) ->
    @base_type = type
  getBaseType : () ->
    return @base_type

  getIndices : () ->
    array = new Array
    @map (element, i) ->
      array.push(element['index'])
    , @getElements()
    return array
      
  getStructures : () ->
    array = new Array
    @map (element, i) ->
      array.push(element['structure'])
    , @getElements()
    return array

  isStack : () ->
    return @getBaseType() == RNAElement.Stack
  isLoop : () ->
    return @getBaseType() == RNAElement.Loop

  isHairpin : () ->
    return @getType() == RNAElement.Hairpin
  isBulge : () ->
    return @getType() == RNAElement.Bulge
  isMultiloop : () ->
    return @getType() == RNAElement.Multiloop
  isDangling : () ->
    return @getType() == RNAElement.Dangling
  isInternal : () ->
    return @getType() == RNAElement.Internal

  getSegmentCount : () ->
    return @segment_count

  setSegmentCount : (count) ->
    @segment_count = count

  map : (func, array) ->
    if array.length == 0 then return false
    return new Library().map(func, array)
  
class @RNA
  constructor : (structure) ->
    @structure = structure.replace( /[^(.)]/g, ".")
    @pair_map = @getPairmap(@structure)
    @root = @parse(0, @structure.length-1, @structure)
    @parse_type(@root)
   
  setRNAElement : (RNAElement) ->
    @RNAElement = RNAElement
             
  getPairmap : (structure) ->
    temp = new Array
    map = new Array
    for i in [0..structure.length-1]
      if structure[i] == "(" then temp.push(i)
      else if structure[i] == ")"
        if temp.length == 0 then throw new RNAException("pair doesn't match")
        index = temp.pop()
        map[index] = i
        map[i] = index
        
    if temp.length > 0 then throw new RNAException("pair doesn't match")
    return map
     
  parse : (start, end, structure) ->
    if RNAElement
      e = new RNAElement(start,structure[start])
    else
      e = new @RNAElement(start, structure[start])

    if @pair_map[start] == end
      # this is a stack
      e.setBaseType(RNAElement.Stack)
      i = start
      j = end
      while @pair_map[i] == j
        e.add(i, structure[i])
        ++i
        --j
      next = @parse(i, j, structure)
      e.addChild(next)
      ++j
      while j <= end
        e.add(j, structure[j])
        ++j
    else
      # everything else is a loop of some sort
      e.setBaseType(RNAElement.Loop)
      i = start
      while i <= end
        if structure[i] == '.'
          e.add(i, structure[i])
        else
          j = @pair_map[i]
          next = @parse(i, j, structure)
          e.addChild(next)
          i = j
        ++i
    
    return e
      
  parse_type : (element) ->
    @map (element) =>
      # A stack is a stack is a stack
      if element.isStack() then return
      
      parent = element.getParent()
      childs = element.getChilds()
      indices = element.getIndices()
      
      if parent && !parent.isStack()
        throw new RNAException("Loop branching off a loop")
      
      if parent == null
        element.setType(RNAElement.Dangling)
      else if childs.length == 1 && childs[0].isStack() 
        if element.getSegmentCount() == 1 then element.setType(RNAElement.Bulge)
        else if element.getSegmentCount() == 2 then element.setType(RNAElement.Internal)
        else throw new RNAException("Structure inconsistency")
      else if childs.length >= 2
        element.setType(RNAElement.Multiloop)
      else if childs.length == 0
        if indices.length < 3 then throw new RNAException("Hairpin length is under 3") 
        element.setType(RNAElement.Hairpin)
      else throw new RNAException("wait... whaa??")

  getStructure : () ->
    return @structure                   

  getRootElement : () ->
    return @root

  map : (func) ->
    _map = (element) ->
      func(element)
      childs = element.getChilds()
      if childs.length > 0
        for i in [0..childs.length-1]
          _map(childs[i])
    _map(@root)

class @RNAException extends Error
  constructor : (message) ->
    @message = message
    super message
  toString : () ->
    return "RNAException: " + @message