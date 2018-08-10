class @BuilderComments extends Builder

  $usernames_ = []
  $suggestion_focus_idx_ = -1
  $mention_in_progress_ = false 

  $comments = null
  $comment_input = null
  $comment_mention = null
  $comment_suggestions = null
  $comment_submit_container = null
  $comment_submit = null
  $submitting = null


  initialize_elements : () ->
    @$comments = @get_element("comments")
    @$comment_input = @get_element("comment-input")
    @$comment_mention = @get_element("mention-button")
    @$comment_suggestions = @get_element("comment-suggestions")
    @$comment_submit_container = @get_element("comment-submit-container")
    @$comment_submit = @get_element("comment-submit")
    @$submitting = @get_element("submitting")


  on_build : (block ,$container, params) ->  
    ThemeCompiler.compile_block(block,params,$container)

    @initialize_elements()
    @initialize_events()

    is_super = parseInt(params['super']) == 1 

    comments = params['comments']
    supercomments = params['supercomments']
    nid = params['nid']
    
    if (!(comments?) and !(supercomments?)) || !(nid?)
      Utils.display_error("comments or nid missing")
      return    
    
    if @$comments?
      packer = Packers(@$comments)      
      if is_super and (supercomments?)
        packer.add(supercomments)
      else if (!is_super) and (comments?)
        packer.add(comments)


    hide = false
    if is_super
      if !(Application.CURRENT_USER?)
        hide = true
      else
        if Application.CURRENT_USER['uid'] != params['uid']
          hide = true

    
    if @$comment_input? && @$comment_submit? && @$comment_mention?
             
      if hide
        @$comment_input.hide()
        @$comment_submit.hide()
        @$comment_mention.hide()
        @$comment_submit_container.hide()
        return

      @$comment_submit.click(() =>
        Application.track_google_analytics_event("comment","submit", "");
        body = @$comment_input.attr("value")
        if Utils.is_text_empty(body)
          Utils.display_error("Please write something")
          return
        
        @lock_commenting()
	
        Comment.post_comment(nid, body, is_super, (ret) =>
          @$comment_input.attr("value","")
          @unlock_commenting()

          if @$comments && ret['comments']
            @$comments.html("")
            packer.add(ret['comments'])      
        )
      )
 
      
      #@initialize_suggestions()



  lock_commenting : () ->
    if @$submitting?
      @$comment_input.disabled = true
      @$comment_input.fadeTo(500, 0.6)
      @$submitting.show()

  unlock_commenting : () ->
    if @$submitting
      @$comment_input.disabled = false
      @$comment_input.fadeTo(200, 1.0)
      @$submitting.hide()


  update_comment : (text) ->
    @$comment_input.focus()

    body = @$comment_input.attr("value")
    
    # separate multiple @ symbols
    if text == "@"
      if body.length > 0
        body += " " 
    body += text
    
    @$comment_input.attr("value", body)
    @$comment_input.show()

    #@initialize_suggestions()


  replace_mention : (username) ->
    @$comment_input.focus()

    if (/(.*)\s+$/.test(username))
      username = username.replace(" ","_")
      username = username.slice(0, username.length - 1) + " "
    else
      username = username.replace(" ","_")
    
    current_mention = null
    current_body = body = @$comment_input.attr("value")
    try
      cursor = @$comment_input.prop('selectionStart')
      current_body = current_body.slice(0, cursor)
    cursor_offset = 0
    current_body = current_body.replace(/@(.*)$/, ($m)=>
      $m_spl = $m.split("@")
      $m_last = $m_spl.pop()
      $m_spl.push( username )
      $m = $m_spl.join("@")
      cursor_offset = username.length - $m_last.length
      return $m
    )
    body = current_body + body.slice(cursor, body.length)

    cursor = @$comment_input.prop('selectionStart')
    @$comment_input.attr("value", body)
    @$comment_input.show()

    @$comment_input.prop('selectionStart', cursor + cursor_offset)
    @$comment_input.prop('selectionEnd', cursor + cursor_offset)
  

  check_mention_in_progress : () -> 
    current_mention = null
    current_body = body = @$comment_input.attr("value")
    try
      cursor = @$comment_input.prop('selectionStart')
      current_body = current_body.slice(0, cursor)
      #if current_body[cursor-1] != " "
      #  for x, i in body.slice(cursor, body.length+1)
      #    if x == " " or x == "@"
      #      break
      #    current_body += x
    current_word = current_body.split(" ").pop()
    if matches = current_word.match(/^[\[\(]*[^a-zA-Z0-9_-]*@([a-zA-Z0-9_'-]*)/)
      if current_word.indexOf("@@") < 0
        current_mention = matches.pop()
        @$mention_in_progress_ = true
    return current_mention 


  comment_suggestions_loading : (search)->
    packer = Packers(@$comment_suggestions)
    packer.add([{
      'loading': 'https://s3.amazonaws.com/eterna/icon_img/loading.gif',
      'search': search
    }])
    if $comment_suggestion_loading = $('.comment-suggestion')
      $comment_suggestion_loading.css('pointer-events': 'none')

    @$comment_suggestions.height(80)
    height = @$comment_suggestions.height()
    @$comment_suggestions.css("top", (48 - height) + "px")  
    @clear_focus()


  comment_suggestions_topbar : (search)->
    packer = Packers(@$comment_suggestions)
    packer.add([{'topbar': 1, 'search': search}])
    if $comment_suggestion_topbar = $('.comment-suggestion')
      $comment_suggestion_topbar.css('pointer-events': 'none')
    @$comment_suggestions.css('min-width': '400px')
    if search? and search != ""
      @$comment_suggestions.css('min-width': (500 + 5*search.length) + 'px')


  initialize_suggestions : () ->

    if !(@$comment_suggestions?)
      return

    @$comment_suggestions.hide()

    # check for current mention in progress
    current_mention = @check_mention_in_progress()
    if current_mention is null
      return

    # init query params
    search = current_mention
    size = 50
    skip = 0
    if search == ''
      size = 5

    # clear suggestions   
    @reset_comment_suggestions(search)
    @comment_suggestions_loading(search)


    # query/display suggestions    
    cb = @
    PageData.get_usernames(search, size, skip, (data) ->
      
      cb.$usernames_ = data['usernames']

      cb.reset_comment_suggestions(search)
      packer = Packers(cb.$comment_suggestions)
      packer.add(cb.$usernames_)
      cb.update_suggestions_layout()

      if cb.$usernames_.length < 1
        cb.$comment_suggestions.hide()
        return
	
    )


  reset_comment_suggestions : (search) ->
    @$comment_suggestions.html('')
    @comment_suggestions_topbar(search)
    @$comment_suggestions.show()
    @$suggestion_focus_idx_ = -1
 

  update_suggestions_layout : () ->
    scroll_top = $(window).scrollTop()
    element_offset = @$comment_suggestions.offset().top
    max_h = @$comment_suggestions.css('max-height')
    if @$usernames_?
      n = @$usernames_.length
      if max_h > ((n + 1) * 40)
        max_h = ((n + 1) * 40)
    height = @$comment_suggestions.height()
    d = element_offset - scroll_top
    if d > 0
      if d < max_h
        max_h = height - d
        max_h -= 10
    else
      max_h = height + d
    
    @$comment_suggestions.height(max_h)
    height = @$comment_suggestions.height()
    @$comment_suggestions.css("top", (48 - height) + "px")  
    @update_suggestion_focus(1)
    

  init_current_suggestion_focus_index : (increment) ->
    if !(@$suggestion_focus_idx_?)
      @$suggestion_focus_idx_ = -1
    index = @$suggestion_focus_idx_ 
    if increment?
      index += increment
    if index >= $('.comment-suggestion').length
      index = 1
    if ingrement? and increment < 0 and index < 0
      index = $('.comment-suggestion').length - 1
    if increment? and increment < 0
      if index == 0
        index = $('.comment-suggestion').length - 1
      if index == -1
        index = $('.comment-suggestion').length - 2
    @$suggestion_focus_idx_ = index    
    if increment? and increment > 0 and index == 0
      index = 1
    return index


  clear_focus : () ->
    # reset focus 
    if $comment_suggestion = @get_element('comment-suggestion')
      $($comment_suggestion).css({
        'border': '0px solid #467097',
        'box-shadow': 'inset 0px 0px 1px rgba(0,0,0,1.0)'
      })    


  update_suggestion_focus : (increment) ->
    index = @init_current_suggestion_focus_index(increment)
    if $comment_suggestion = @get_element('comment-suggestion')
      @clear_focus()
      # highlight div
      $($comment_suggestion.get(index)).css({
        'box-shadow': '0px 0px 2px',
        'border':'1px solid rgba(256,256,256,0.5)'
      })
      # scroll to div
      scroll_offset = ((index + 1) * 40) - @$comment_suggestions.height() 
      @$comment_suggestions.css({
        scrollTop: scroll_offset
      })


  get_current_suggestion_username : () ->    
    if @$usernames_? and @$usernames_.length > 0    
      index = @init_current_suggestion_focus_index(0) - 1
      if $users = @get_element('comment-suggestion-user')
        if $user = $users.get(index)
          if username = $user.dataset.username
            return username
    @$comment_suggestions.hide()        
    return null


  try_current_suggestion : (pad) ->
    if username = @get_current_suggestion_username()
      console.log("try suggestion: " + username)
      if pad? and pad is true
        @replace_mention(username + " ")
      else
        @replace_mention(username)
    return


  initialize_events : () ->

    cb = @
    
    # text input events 
    @$comment_input.on('input propertychange', (e)=>
      cb.initialize_suggestions()      
    )

    # initialize keydown events
    @$comment_input.keydown((e)=>
      if e.which == 9  # tab
        cb.check_mention_in_progress()
        if cb.$mention_in_progress_ is true
          e.preventDefault()	
          if e.shiftKey is true
            cb.update_suggestion_focus(-1)
          else
            cb.update_suggestion_focus(1)
        if cb.$usernames_? and cb.$usernames_.length == 1
          cb.try_current_suggestion(true)
          cb.$comment_suggestions.hide()
          cb.$mention_in_progress_ = false      
        else
          cb.try_current_suggestion()
      if e.which == 13  # enter
        cb.check_mention_in_progress()
        if cb.$mention_in_progress_ is true
          e.preventDefault()	
          cb.try_current_suggestion(true)
          cb.$comment_suggestions.hide()
          cb.$mention_in_progress_ = false
      if e.which == 27  # esc
        cb.$mention_in_progress_ = false
        cb.$comment_suggestions.hide()
      if e.which == 32  # space
        cb.$mention_in_progress_ = false
        cb.$comment_suggestions.hide()
    )

    # comment input events
    @$comment_input.keyup((e)=>
      if e.which == 16  # shift
        return
      if e.which == 9   # tab
        #cb.unlock_commenting()
        return
    )


    # mention button
    @$comment_mention.click(() =>
      cb.update_comment("@")
      cb.initialize_suggestions()      
    )

    # suggestion events
    if $comment_suggestion_user = @get_element('comment-suggestion-user')
      $comment_suggestion_user.click(()=>
        if username = $(this).dataset.username
          cb.replace_mention(username)
          cb.update_comment(" ")
      )

    $(window).bind('resize', ()=>
      if resize_timeout?
        clearTimeout(resize_timeout)
      resize_timeout = setTimeout(()=>
        cb.update_suggestions_layout()
      , 500);
    )

    $(window).bind('scroll', ()=>
      if scroll_timeout?
        clearTimeout(scroll_timeout)
      scroll_timeout = setTimeout(()=>
        cb.update_suggestions_layout()
      , 800);
    )


class @BuilderComment extends Builder

  on_build : (block ,$container, params) ->
  
    params['picture'] = EternaUtils.get_user_picture(params['picture'])
    params['is_deletable'] = if Application.CURRENT_USER? then Application.CURRENT_USER['uid'] == params['uid'] else false

    params['comment'] = EternaUtils.format_comment_mentions(params['comment'])

    cid = params['cid']
    
    if !(cid?)
      Utils.display_error("cid missing")
      return
  
    ThemeCompiler.compile_block(block,params,$container)
    
    if $delete = @get_element("delete")
      $delete.click(() =>
        $container.hide()
        Comment.delete_comment(cid, (ret) => 
        )
      )
      
    

class @BuilderCommentSuggestion extends Builder

  text_ = null

  on_build : (block ,$container, params) ->

    # testing
    @text_ = params['username']
    params['userpicture'] = EternaUtils.get_user_picture(params['userpicture'])


    ThemeCompiler.compile_block(block,params,$container)
 
  
      
    
