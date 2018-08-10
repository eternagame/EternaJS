class @BuilderGroups extends Builder
  
  on_build : (block, $container, params) ->
    
    skip = params['skip']
    size = params['size']
    search = params['search']
    sort = params['sort']
    
    if !(sort?)
      sort = params['sort'] = "date"

    if !(skip?)
      skip = 0
    if !(size?)
      size = 9
        
    PageData.get_groups(skip, size, search, sort, (page) =>
      param_string = {}
      param_string.size = size
      param_string.search = search
      param_string.sort = "date"
      params['date_sort_url'] = "/web/group/?" + Utils.generate_parameter_string(param_string)
      param_string.sort = "title"
      params['title_sort_url'] = "/web/group/?" + Utils.generate_parameter_string(param_string)
      param_string.sort = params['sort']
      groups = page["groups"]
      ThemeCompiler.compile_block(block,params,$container)
      
      $groups = @get_element("groups")
      packer = Packers($groups)
      group_params = []
      
      for ii in [0..groups.length-1] by 1
        name = EternaUtils.format_summary(groups[ii]['name'], 10)
        founder_name = EternaUtils.format_summary(groups[ii]['founder_name'], 12)
        group_params.push({nid:groups[ii]['nid'], name:name, num_members:groups[ii]['num_members'], description:groups[ii]['description'], founder_uid:groups[ii]['founder_uid'], founder_name:founder_name, founder_picture:EternaUtils.get_user_picture(groups[ii]['founder_picture']), group_picture:groups[ii]['picture'], is_private:groups[ii]['is_private'], created:groups[ii]['created']})
      
      packer.add(group_params)
      
      total_groups = page["num_groups"]
      
      if $pager = @get_element("pager")
        pager_str = EternaUtils.get_pager(Math.floor(skip /size), Math.ceil(total_groups/size), (pageindex) =>
          url_params = {skip:pageindex * size, size:size, sort:sort}
          if search?
            url_params['search'] = search
          if sort?
            url_params['sort'] = sort
          return "/web/group/?" + Utils.generate_parameter_string(url_params, true)  
        )
      
        $pager.html(pager_str)
      
      if $search = @get_element("search")
        $search.attr("value", search)
        
        $search.keyup((e) =>
          if e.keyCode == KeyCode.KEYCODE_ENTER
            search = $search.attr("value")
            param_string['search'] = search
            url = "/web/group/?" + Utils.generate_parameter_string(param_string, true)
            Utils.redirect_to(url)
        )  
      
    )

class @BuilderMyGroups extends Builder
  
  on_build : (block, $container, params) ->
    
    my_skip = params['my_skip']
    my_size = params['my_size']
    my_search = params['my_search']
    my_sort = params['my_sort']
    
    if !(my_sort?)
      my_sort = params['my_sort'] = "date"

    if !(my_skip?)
      my_skip = 0
    if !(my_size?)
      my_size = 6
        
    PageData.get_my_groups(my_skip, my_size, my_search, my_sort, (page) =>
      
      param_string = {}
      param_string.my_size = my_size
      param_string.my_search = my_search
      param_string.my_sort = "date"
      params['date_sort_url'] = "/web/group/?" + Utils.generate_parameter_string(param_string)
      param_string.my_sort = "title"
      params['title_sort_url'] = "/web/group/?" + Utils.generate_parameter_string(param_string)
       
      groups = page["groups"]
      
      if page['uid']?
        if groups.length > 0
          params['my_group_valid'] = true
      else
        params['my_group_valid'] = false
              
      ThemeCompiler.compile_block(block,params,$container)
      
      $groups = @get_element("groups")
      packer = Packers($groups)
      group_params = []
      my_total_groups = page['num_groups'].length
      for ii in [0..groups.length-1] by 1
        name = EternaUtils.format_summary(groups[ii]['name'], 10)
        founder_name = EternaUtils.format_summary(groups[ii]['founder_name'], 12)
        group_params.push({nid:groups[ii]['nid'], name:name, num_members:groups[ii]['num_members'], description:groups[ii]['description'], founder_uid:groups[ii]['founder_uid'], founder_name:founder_name, founder_picture:EternaUtils.get_user_picture(groups[ii]['founder_picture']), group_picture:groups[ii]['picture'], is_private:groups[ii]['is_private'], created:groups[ii]['created']})
      
      packer.add(group_params)
      
      if $pager = @get_element("my_pager")
        pager_str = EternaUtils.get_pager(Math.floor(my_skip /my_size), Math.ceil(my_total_groups/my_size), (my_pageindex) =>
          url_params = {my_skip:my_pageindex * my_size, my_size:my_size, my_sort:my_sort}
          if my_search?
            url_params['my_search'] = my_search
          return "/web/group/?" + Utils.generate_parameter_string(url_params, true)  
        )
      
        $pager.html(pager_str)
      
      if $search = @get_element("my_search")
        $search.attr("value", my_search)
        
        $search.keyup((e) =>
          if e.keyCode == KeyCode.KEYCODE_ENTER
            my_search = $search.attr("value")
            url = "/web/group/?" + Utils.generate_parameter_string({my_search:my_search}, true)
            Utils.redirect_to(url)
        )  
      
    )
    
class @BuilderGroup extends Builder
  on_build : (block, $container, params) ->
    
    nid = params['nid']
    skip = params['skip']
    size = params['size']
    search = params['search']
    
    if !(skip?)
      skip = 0
    if !(size?)
      size = 10
    
    if !(nid?)
      Utils.display_error("nid not specified")
      return
            
    PageData.get_group(nid, skip, size, search, (page) =>
      group = page['group']

      param_string = {}
      param_string.size = size
      param_string.search = search
       
      input_params = {}
      input_params['name'] = group['name']
      input_params['created'] = group['created']
      input_params['score'] = group['score']
      input_params['body'] = EternaUtils.format_body(group['body'])      
      input_params['group_picture'] = group['picture']
      input_params['is_admin'] = page['is_admin']
      
      if page['uid'] is group['founder_uid']
        input_params['is_founder'] = true
      else
        input_params['is_founder'] = false
        
      if page['uid']? and !input_params['is_founder']
        input_params['is_logged_in'] = true
      else
        input_params['is_logged_in'] = false
        
      input_params['founder_uid'] = group['founder_uid']
      input_params['founder_name'] = group['founder_name']      
      input_params['founder_picture'] = EternaUtils.get_user_picture(group['founder_picture'])
      input_params['is_private'] = group['is_private']
      input_params['comments'] = page['comments']            
      input_params['nid'] = nid
      input_params['num_members'] = group['num_members']
      total_num_comments = page['total_num_comments']
      
      if (page['is_member'])
        input_params['acc_comments'] = true
      else if (page['uid'] == '48166')
        input_params['acc_comments'] = true
      else
        input_params['acc_comments'] = false

      input_params['is_group_admin'] = page['is_admin']
      
      ThemeCompiler.compile_block(block,input_params,$container) 
            
      group_members = page["group_members"]
      if group_members?      
        $group_members = @get_element("group_members")
        packer = Packers($group_members)
        members_params = []        
        for ii in [0..group_members.length-1] by 1
            members_params.push({uid:group_members[ii]['uid'],name:group_members[ii]['name'],picture:EternaUtils.get_user_picture(group_members[ii]['picture'])})
        packer.add(members_params)
      
      group_admins = page["group_admins"]
      if group_admins?
        $group_admins = @get_element("group_admins")
        packer = Packers($group_admins)
        admins_params = []        
        for ii in [0..group_admins.length-1] by 1
          admins_params.push({uid:group_admins[ii]['uid'], name:group_admins[ii]['name'],picture:EternaUtils.get_user_picture(group_admins[ii]['picture'])})        
        packer.add(admins_params)
      
      group_pendings = page["group_pendings"]
      if group_pendings?
        $group_pendings = @get_element("group_pendings")
        packer = Packers($group_pendings)
        pendings_params = []        
        for ii in [0..group_pendings.length-1] by 1
          pendings_params.push({idx:ii, uid:group_pendings[ii]['uid'], name:group_pendings[ii]['name'],picture:EternaUtils.get_user_picture(group_pendings[ii]['picture'])})
        packer.add(pendings_params)
        accept_params = []
        reject_params = []     
        for ii in [0..group_pendings.length-1] by 1
          if accept_params[ii] = @get_element(ii+"_accept")
            accept_params[ii].click((event) =>
              Overlay.set_loading("replying..")
              Overlay.show()
              uidx = (event.target.id).split("_accept")[0] 
              pending_uid = group_pendings[uidx]['uid']
              Group.accept(pending_uid, nid, (data) =>
                alert data['error']                  
                Overlay.hide()
                Utils.redirect_to("/web/group/#{nid}/") 
              )               
            )
          if reject_params[ii] = @get_element(ii+"_reject")
            reject_params[ii].click((event) =>
              Overlay.set_loading("replying..")
              Overlay.show()
              uidx = (event.target.id).split("_reject")[0]
              pending_uid = group_pendings[uidx]['uid']
              Group.reject(pending_uid, nid, (data) =>
                alert data['error']
                Overlay.hide()
                Utils.redirect_to("/web/group/#{nid}/") 
              )               
            )            
                    
      if page['is_member'] or page['is_pending']
        @show_unsubscribe()
      else
        @show_subscribe()
            
      if page['is_following']
        @show_unfollow()
      else
        @show_follow()
      
      if $pending_group = @get_element("pending_group")
        if page['is_pending']
          $pending_group.show()
        else
          $pending_group.hide()
      
      uid = page['uid']
      
      if $subscribe_group = @get_element("subscribe_group")
        $subscribe_group.click(() =>
          Overlay.set_loading("replying..")
          Overlay.show()
          if group['is_private'] is 'true'
            if confirm "You'll have to wait for approval"
              Group.subscribe(uid, nid, group['is_private'], (data) =>
                alert data['error']
                if data['subscribe_success']
                  @show_unsubscribe()
                @show_follow()                
                Overlay.hide()
                Utils.redirect_to("/web/group/#{nid}/")                                
              )
          else
            Group.subscribe(uid, nid, group['is_private'], (data) =>
              alert data['error']
              if data['subscribe_success']
                @show_unsubscribe()
              if data['follow_success']
                @show_unfollow()
              Overlay.hide()
              Utils.redirect_to("/web/group/#{nid}/")
            )                 
        )
      
      if $unsubscribe_group = @get_element("unsubscribe_group")
        $unsubscribe_group.click(() =>
          if !input_params['is_founder']
            Overlay.set_loading("replying..")
            Overlay.show()                 
            Group.unsubscribe(uid, nid, (data) =>
              alert data['error']
              if data['unfollow_success']
                @show_follow()
              if data['unsubscribe_success']
                @show_subscribe()
              Overlay.hide()
              Utils.redirect_to("/web/group/#{nid}/")              
            )
          else
            alert "You cannot unsubscribe this group"
        )
        
      if $follow_group = @get_element("follow_group")
        $follow_group.click(() =>
          Overlay.set_loading("replying..")
          Overlay.show()
          Group.follow_group(uid, nid, (data) =>
            alert data['error']
            if data['success']
              @show_unfollow()
            Overlay.hide()
          )
        )
      
      if $unfollow_group = @get_element("unfollow_group")
        $unfollow_group.click(() =>
          Overlay.set_loading("replying..")
          Overlay.show()
          Group.unfollow_group(uid, nid, (data) =>
            if data['success']
              @show_follow() 
              alert "Successfully unfollowed this group!"
            else
              alert "Fail to unfollow this group. Please try again!"             
            Overlay.hide()
          )
        )
                
      if $delete_group = @get_element("delete_group")
        $delete_group.click(() =>
          Overlay.set_loading("replying..")
          Overlay.show()
          Follow.expire_followers(nid, "group", (data) =>
            if !data['success']
              alert "Fail to unfollow the group.Try again."
          )
          Group.delete(nid, (data) =>
            if !data['success']
              alert "Fail to delete. Try again"            
            Overlay.hide()
            Utils.redirect_to("/web/group/")              
          )
        )
 
      if $sendmessage = @get_element("sendmessage")
        $sendmessage.click(()=>
          block = Blocks("overlay-messages")
          $overlay_slot = Overlay.get_slot("sendmessage")
          Overlay.load_overlay_content("sendmessage")
          Overlay.show()
          
          if block['template_context_variables_'] == null
            block.add_block($overlay_slot, {target_name:"all group members"})
        )

      if $pager = @get_element("pager")
        pager_str = EternaUtils.get_pager(Math.floor(skip/size), Math.ceil(total_num_comments/size), (pageindex) =>
          url_params = {skip:pageindex*size, size:size}
          if search?
            url_params['search'] = search
          return "/web/group/"+nid+"/?"+Utils.generate_parameter_string(url_params, true)  
        )
        $pager.html(pager_str)
      
      if $search = @get_element("search")
        $search.attr("value", search)
        $search.keyup((e) =>
          if e.keyCode == KeyCode.KEYCODE_ENTER
            search = $search.attr("value")
            url = "/web/group/"+nid+"/?"+Utils.generate_parameter_string({search:search}, true)
            Utils.redirect_to(url)
        )       
    )
  
  show_subscribe : () ->
    if $subscribe_group = @get_element("subscribe_group")
      $subscribe_group.show()
    if $unsubscribe_group = @get_element("unsubscribe_group")
      $unsubscribe_group.hide()
  
  show_unsubscribe : () ->
    if $subscribe_group = @get_element("subscribe_group")
      $subscribe_group.hide()
    if $unsubscribe_group = @get_element("unsubscribe_group")
      $unsubscribe_group.show()
      
  show_follow : () ->
    if $follow_group = @get_element("follow_group")
      $follow_group.show()
    if $unfollow_group = @get_element("unfollow_group")
      $unfollow_group.hide()
      
  show_unfollow : () ->
    if $follow_group = @get_element("follow_group")
      $follow_group.hide()
    if $unfollow_group = @get_element("unfollow_group")
      $unfollow_group.show()   

class @BuilderOverlayMessages extends Builder
  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    if $send_button = @get_element("send-button")
      $send_button.click(()=>
        if $_body = @get_element("body")
          body = $_body.attr("value")
          if Utils.is_text_empty(body)
            Utils.display_error("Please enter the message");
            return
          
          post_params = {}
          #post_params['target_uid'] = params['uid']
          post_params['group_nid'] = params['nid']
          post_params['body'] = body
          post_params['notification_type'] = "message";
          post_params['workbranch'] = Page.get_current_page_parameters()['workbranch'];
          post_params['action'] = "add";
          post_params['type'] = "messages";
          
          Overlay.set_loading("sending..");
          Overlay.show();
          
          AjaxManager.query("POST", Application.POST_URI, post_params, (response) =>
            EternaUtils.process_response(response, (data) =>
              _body.attr("value","")
            )
          , (data) =>
              Utils.display_error("Could not send the message : " + data['errors'])
          )
          Overlay.hide()
      )

class @BuilderOverlayInviteMember extends Builder
  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    if $send_button = @get_element("send-button")
      $send_button.click(()=>
        $_body = document.getElementById("invite-message");
        body = $_body.innerHTML
          
        if $_to = @get_element("to")
          to = $_to.attr("value")
          if Utils.is_text_empty(to)
            Utils.display_error("Please enter the member's name");
            return            
          
          nid = params['nid']
          post_params = {}    
          post_params['group_nid'] = params['nid']      
          post_params['target_names'] = to
          post_params['body'] = body
          post_params['notification_type'] = "message";
          post_params['workbranch'] = Page.get_current_page_parameters()['workbranch'];
          post_params['action'] = "add";
          post_params['type'] = "invite_member";
          
          Overlay.set_loading("sending..");
          Overlay.show();
          
          Group.invite_member(post_params, (data) =>
            alert data['error']
          )         
          Overlay.hide()
      )

class @BuilderOverlayAddAdmin extends Builder
  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    if $send_button = @get_element("send-button")
      $send_button.click(()=>
        $_body = document.getElementById("add-message");
        body = $_body.innerHTML
        #alert body
          
        if $_to = @get_element("to")
          to = $_to.attr("value")
          if Utils.is_text_empty(to)
            Utils.display_error("Please enter the member's name");
            return            
          
          nid = params['nid']
          post_params = {}          
          post_params['group_nid'] = params['nid']
          post_params['target_names'] = to          
          post_params['body'] = body
          post_params['notification_type'] = "message"
          post_params['workbranch'] = Page.get_current_page_parameters()['workbranch']
          post_params['action'] = "add"
          post_params['type'] = "add_admin"
          
          Overlay.set_loading("sending..")
          Overlay.show()          
          Group.add_admin(post_params, (data) =>
            alert data['error']
          ) 
          Overlay.hide()
      )

class @BuilderGroupCreate extends Builder
  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    
    #Create Group
    if $create_group = @get_element("create-button")
      $create_group.click(() =>
        $title = @get_element("group-title-input")          
        if $title.attr('value') == ""
          alert "You have to write the title!!"
          return
          
        $description = @get_element("group-description-input")
        if $description.attr('value') == ""
          alert "You have to write to description!!"
          return
            
        $private = @get_element("private")
        $public = @get_element("public")
        
        if !($private.attr('checked') || $public.attr('checked'))
          alert "You have to select a type"
          return
           
        Overlay.set_loading("replying..")
        Overlay.show()
        if $group_profile = @get_element("group_profile")            
          $group_profile.submit()
        Overlay.hide()      
      )
        
    if $cancel = @get_element("cancel-button")
      $cancel.click(() =>
        Utils.redirect_to("/web/group/")
      )
      
class @BuilderGroupEdit extends Builder
  on_build : (block, $container, params) ->
    
    nid = params['nid']
    
    if !(nid?)
      Utils.display_error("nid not specified")
      return
        
    PageData.get_group(nid, null, null, null, (page) =>
      group = page['group']
      input_params = {}
      input_params['group_name'] = group['name']
      input_params['group_description'] = EternaUtils.format_body(group['body'])      
      input_params['group_picture'] = group['picture']
      input_params['is_private'] = group['is_private']
      input_params['nid'] = nid      
      ThemeCompiler.compile_block(block,input_params,$container)
      
      if $edit = @get_element("edit-button")
        $edit.click(() =>
          Overlay.set_loading("replying..")
          Overlay.show()
          if $group_profile = @get_element("group_profile")            
            $group_profile.submit()   
          Overlay.hide()      
        )
      
      if $cancel = @get_element("cancel-button")
        $cancel.click(() =>
          Utils.redirect_to("/web/group/#{nid}/")
        )
        
      if $invite_member = @get_element("invite-member")
        $invite_member.click(()=>
          block = Blocks("overlay-invite-message")
          $overlay_slot = Overlay.get_slot("invite-member")
          Overlay.load_overlay_content("invite-member")
          Overlay.show()
          if block['template_context_variables_'] == null
            block.add_block($overlay_slot)
        )
              
      if $add_admin = @get_element("add-admin")
        $add_admin.click(()=>
          block = Blocks("overlay-add-admin-message")
          $overlay_slot = Overlay.get_slot("add-admin")
          Overlay.load_overlay_content("add-admin")
          Overlay.show()
          if block['template_context_variables_'] == null
            block.add_block($overlay_slot)
        )   
        
    , (data) =>
        alert JSON.stringify(data)
    )
