class @BuilderTutScripts extends Builder
  on_build : (block, $container, params) ->
    if params['uid']
      uid = params['uid']
      ThemeCompiler.compile_block(block,params,$container)
      PageData.get_tutscripts(uid, (page) =>
        @build_scripts(block, $container, params, page)
      )
    else if params['pid']
      pid = params['pid']
      params['can_create_script'] = true;
      ThemeCompiler.compile_block(block,params,$container)
      PageData.get_puzzle_tutscripts(pid, (page) =>
        @build_scripts(block, $container, params, page)
      )
    else
      ThemeCompiler.compile_block(block,params,$container)
      PageData.get_all_tutscripts((page) =>
        @build_scripts(block, $container, params, page)
      )
  build_scripts : (block, $container, params, page) ->
    $puzzles = @get_element("scripts")
    packer = Packers($puzzles)
    packer.add(page["tutscripts"])

class @BuilderTutScriptEditor extends Builder
  on_build : (block, $container, params) ->
    is_new = params['new'];
    if is_new
      @process_new_page(block, $container, params)
    else 
      nid = params['nid']
      PageData.get_tutscript(nid, (page) =>
          @process_edit_page(block, $container, params, page, nid)
        )
  process_new_page: (block, $container, params) ->
    script_params = {}
    script_params['pid'] = params['pid'];
    script_params['user_does_not_own'] = false;
    script_params['new'] = true;
    ThemeCompiler.compile_block(block, script_params, $container)

    if $save = @get_element("save")
      $save.click(() =>
        if $form_script = @get_element("form_script")
          $form_script.submit()
        )

  process_edit_page: (block, $container, params, page, nid) ->
    script_params = {}
    script_params['title'] = page['tutscript']['title'];
    script_params['script'] = page['tutscript']['script'];
    script_params['description'] = page['tutscript']['description'];
    script_params['nid'] = nid;
    script_params['pid'] = page['tutscript']['pid'];
    script_params['user_does_not_own'] = (page['tutscript']['uid'] != Application.CURRENT_USER['uid'])
    ThemeCompiler.compile_block(block, script_params, $container)

    if $save = @get_element("save")
      $save.click(() =>
        if $form_script = @get_element("form_script")
          $form_script.submit()
        )