class @BuilderPlayerPubsList extends Builder
  
  on_build : (block, $container, params) ->
    Application.track_google_analytics_event("player pubs","open", "");
    skip = params['skip']
    size = params['size']
    search = params['search']

    if !(skip?)
      skip = 0
    if !(size?)
      size = 5
    




    PageData.get_playerpubslist(skip, size, search, (page) =>
      
      
      playerpubslist = page["playerpubslist"]

      ThemeCompiler.compile_block(block,params,$container)

 
      $playerpubslist = @get_element("playerpubslist")
      if playerpubslist = page['playerpubslist']	    
        pubs_block = Blocks("playerpubsitem")
        for ii in [0..playerpubslist.length-1] by 1
          
          pubs_block.add_block($playerpubslist,{pubid:playerpubslist[ii]['pubid'], title:playerpubslist[ii]['title'], journal:playerpubslist[ii]['journal'], pub_date:playerpubslist[ii]['pub_date'], authors:playerpubslist[ii]['authors'], has_player_authors:playerpubslist[ii]['has_player_authors'], image:playerpubslist[ii]['image'], link:playerpubslist[ii]['link'], preprint:playerpubslist[ii]['status'], abstract:playerpubslist[ii]['abstract'], pdf_link:playerpubslist[ii]['pdf_link'], review_link:playerpubslist[ii]['review_link']})
          


      total_player_pubs = page['num_player_pubs']
      
      if $pager = @get_element("pager")
        pager_str = EternaUtils.get_pager(Math.floor(skip /size), Math.ceil(total_player_pubs/size), (pageindex) =>
          url_params = {skip:pageindex * size, size:size}
          if search?
            url_params['search'] = search
          return "/web/pubs/?" + Utils.generate_parameter_string(url_params, true)  
        )
      
        $pager.html(pager_str)
      
      if $search = @get_element("search")
        $search.attr("value", search)
        
        $search.keyup((e) =>
          if e.keyCode == KeyCode.KEYCODE_ENTER
            search = $search.attr("value")
            url = "/web/pubs/?" + Utils.generate_parameter_string({search:search}, true)
            Utils.redirect_to(url)
        )
    )
    
  

class @BuilderResearcherPubsList extends Builder
  
  on_build : (block, $container, params) ->
    Application.track_google_analytics_event("researcher pubs","open", "");
    skip = params['skip']
    size = params['size']
    search = params['search']

    if !(skip?)
      skip = 0
    if !(size?)
      size = 10
    




    PageData.get_researcherpubslist(skip, size, search, (page) =>
      
      
      researcherpubslist = page["researcherpubslist"]

      ThemeCompiler.compile_block(block,params,$container)

 
      $researcherpubslist = @get_element("researcherpubslist")
      if researcherpubslist = page['researcherpubslist']      
        pubs_block = Blocks("researcherpubsitem")
        for ii in [0..researcherpubslist.length-1] by 1
          
          pubs_block.add_block($researcherpubslist,{pubid:researcherpubslist[ii]['pubid'], title:researcherpubslist[ii]['title'], journal:researcherpubslist[ii]['journal'], pub_date:researcherpubslist[ii]['pub_date'], authors:researcherpubslist[ii]['authors'], has_player_authors:researcherpubslist[ii]['has_player_authors'], image:researcherpubslist[ii]['image'], link:researcherpubslist[ii]['link'], preprint:researcherpubslist[ii]['status'], abstract:researcherpubslist[ii]['abstract'], pdf_link:researcherpubslist[ii]['pdf_link'], review_link:researcherpubslist[ii]['review_link']})
          


      total_researcher_pubs = page['num_researcher_pubs']
      
      if $pager = @get_element("pager")
        pager_str = EternaUtils.get_pager(Math.floor(skip /size), Math.ceil(total_researcher_pubs/size), (pageindex) =>
          url_params = {skip:pageindex * size, size:size}
          if search?
            url_params['search'] = search
          return "/web/pubs/researcher/?" + Utils.generate_parameter_string(url_params, true)  
        )
      
        $pager.html(pager_str)
      
      if $search = @get_element("search")
        $search.attr("value", search)
        
        $search.keyup((e) =>
          if e.keyCode == KeyCode.KEYCODE_ENTER
            search = $search.attr("value")
            url = "/web/pubs/?" + Utils.generate_parameter_string({search:search}, true)
            Utils.redirect_to(url)
        )
    )
    
  

