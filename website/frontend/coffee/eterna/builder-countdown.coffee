class @BuilderCountdown extends Builder

  _types = [
    #'months',
    'weeks',
    'days',
    'hours',
    'minutes',
    'seconds'
  ]
  
  on_build: (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    
    clocks = @get_element("countdown-clock")
    if !(clocks?)
      return

    
    for $clock in clocks
      deadline = $clock.dataset.deadline
      timezone = $clock.dataset.timezone
      if timezone?
        deadline = moment.tz(deadline, timezone).toDate()
      if deadline?
        _cached_times = (new -> @[type] = 0 for type in _types; @)
        @_initialize()
        @get_element("countdown-clock").countdown(deadline)
          .on('update.countdown', (event) ->	      
            for type in _types
              time = event.offset[type]
              if type in ['months']
                if time == 0
                  $(this).parent().find('.'+type).hide()
                else
                  event.offset['weeks'] -= time * 4
              if time == _cached_times[type]
                continue
              _cached_times[type] = time
              format = BuilderCountdown.prototype.format_time(time, type)
              $(this).parent().find('.'+type).html(format)
          )


  _initialize : () =>
    format = ''
    for type in _types
      time = 0
      format += '<div class="time ' + type + ' flip">'
      format += BuilderCountdown.prototype.format_time(time, type)
      format += '</div>'
    @get_element("countdown-clock").html(format)


  format_time : (time, type) ->
    return @_strftime(time, type)
 

  format_event : (event) ->
    format = ''
    if (event.offset.months > 0) 	  
      format += @_strftime(event.offset.months, 'months')
    if (event.offset.weeks > 0) 	  
      format += @_strftime(event.offset.weeks, 'weeks')
    if (event.offset.days > 0)
      format += @_strftime(event.offset.days, 'days')
    format += @_strftime(event.offset.hours, 'hours')
    format += @_strftime(event.offset.minutes, 'minutes')
    format += @_strftime(event.offset.seconds, 'seconds')
    return format
  

  _strftime : (time, type) ->
    next = time
    curr = @_get_curr_time(next, type)
    next = ('0' + next).slice(-2)
    curr = ('0' + curr).slice(-2)
    format = ''
    format += '<span class="count curr top">'    + curr + '</span>'
    format += '<span class="count next top">'    + next + '</span>'
    format += '<span class="count next bottom">' + next + '</span>'
    format += '<span class="count curr bottom">' + curr + '</span>'
    format += '<span class="label">' + @_get_label(type) + '</span>'
    return format


  _get_curr_time : (next, type) ->
    curr = next + 1
    switch type
      when 'days'
        if curr >= 7 then curr = 0
      when 'hours'
        if curr >= 24 then curr = 0
      when 'minutes'
        if curr >= 60 then curr = 0
      when 'seconds'
        if curr >= 60 then curr = 0
      else curr = curr
    return curr

  _get_label : (type) ->
    switch type
      when 'months' then return 'month'
      when 'weeks' then return 'week'
      when 'days' then return 'day'
      when 'hours' then return 'hour'
      when 'minutes' then return 'min'
      when 'seconds' then return 'sec'
      else return type
