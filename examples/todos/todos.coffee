###
   todos.coffee - a todo list implementation for outback.js
   http://github.com/politician/outback
###

###
Todo Model
###

class Todo extends Backbone.Model
   defaults: ->
      done: false
      order: Todos.nextOrder()
     

###
Todo Collection
###

# The collection of todos is backed by localStorage instead of a remote server.
class TodoList extends Backbone.Collection

   # Reference to this collection's model.
   model: Todo

   # Save all of the todo items under the "todos" namespace.
   localStorage: new Store 'todos'

   # Filter down the list of all todo items that are finished.
   done: =>
      @filter (todo) -> todo.get 'done'

   # Filter down the list to only todo items that are still not finished.
   remaining: =>
      @reject (todo) -> todo.get 'done'

   # We keep the Todos in sequential order, despite being saved by unordered 
   # GUID in the database. This generates the next order number for new items.
   nextOrder: =>
      return 1 if not @length
      @last().get('order') + 1

   # Todos are kept sorted by their original insertion order.
   comparator: (todo) ->
      todo.get 'order'
   
###
Todo Item View Model
###

# The view model tracks transient state such as whether we're in "edit" mode.
class TodoViewModel extends Backbone.Model
   defaults:
      editing: false

###
Todo Item View
###

# The DOM element for a todo item...
class TodoView extends Backbone.View

   # ... is a list tag.
   tagName: 'li'

   # CoffeeScript + outback === <3 
   template: '''
   <div class="todo" data-bind="css: { done: @done }">
     <div class="display">
       <input class="check" type="checkbox" data-bind="checked: @done" />
       <div class="todo-text" data-bind="text: @text"></div>
       <span class="todo-destroy"></span>
     </div>
     <div class="edit">
       <input class="todo-input" type="text" data-bind="value: @text" />
     </div>
   </div>
   '''

   # The view model...
   viewModel: new TodoViewModel

   # ... is bound to the DOM, unobtrusively.  This is the equivalent of adding
   # a data-bind-view attribute to the div with the todo class.
   viewModelBindings:
      'div.todo': 
         css: 
            editing: Backbone.outback.modelRef 'editing'
      'div.todo-input':
         hasfocus:
            editing: Backbone.outback.modelRef 'editing'

   # Listen to the DOM.
   events:
      'dblclick div.todo-text'      : 'edit'
      'click span.todo-destroy'     : 'clear'
      'keypress .todo-input'        : 'updateOnEnter'

   # The TodoView listens for changes to its model, re-rendering.
   initialize: ->

      # Remove the view from the DOM if its model is destroyed.
      @model.bind 'destroy', @remove, @

      # Monitor the editing variable, so that we can save the todo after an
      # edit.
      @viewModel.bind 'change:editing', @saveIfEditComplete, @

   render: =>
      # Insert the template into the DOM
      @$el.html @template

      # Tell outback to set up any data bindings
      Backbone.outback.bind @
      @

   remove: =>
      # Tell outback to clean up any data bindings
      Backbone.outback.unbind @

      # Remove this view from the DOM.
      @$el.remove();

   # Switch this view into "editing" mode, displaying the input field.
   edit: =>
      @viewModel.set 'editing', true

   # If you hit enter, we're through editing the item.
   updateOnEnter: (e) =>
      @viewModel.set 'editing', false if e.keyCode is 13

   # Close the "editing" mode, saving changes to the todo.
   saveIfEditComplete: =>
      @model.save() if !@viewModel.get 'editing'

   # Destroy the model, triggering the removal of this view.
   clear: =>
      @model.destroy()

###
The Application
###

# Our overall *AppView* is the top-level piece of UI.
class AppView extends Backbone.View

   # Instead of generating a new element, bind to the existing skeleton of
   # the App already present in the HTML.
   el: $('#todoapp')

   # Our template for the line of statistics at the bottom of the app.
   statsTemplate: _.template $('#stats-template').html()

   # Delegated events for creating new items, and clearing completed ones.
   events:
      'keypress #new-todo'    : 'createOnEnter'
      'keyup #new-todo'       : 'showTooltip'
      'click .todo-clear a'   : 'clearCompleted'

   # At initialization we bind to the relevant events on the `Todos` 
   # collection, when items are added or changed. Kick things off by loading
   # any preexisting todos that might be saved in localStorage.
   initialize: ->
      @input = @$('#new-todo')
      @stats = @$('#todo-stats')

      Todos.on 'add', @addOne, @
      Todos.on 'reset', @addAll, @
      Todos.on 'all', @render, @

      Todos.fetch()

   # Re-rendering the App just means refreshing the statistics -- the rest of
   # the app doesn't change.
   render: =>
      @stats.html @statsTemplate
         total: Todos.length
         done: Todos.done().length
         remaining: Todos.remaining().length

   # Add a single todo item to the list by creating a view for it, and 
   # appending its element to the `<ul>`.
   addOne: (todo) =>
      view = new TodoView 
         model: todo

      $("#todo-list").append(view.render().el);

   # Create views for all of the items in the *Todos* collection at once.
   addAll: =>
      Todos.each @addOne

   # If you hit return in the main input field, and there is text to save, 
   # create new Todo model persisting it to localStorage.
   createOnEnter: (e) =>
      text = @input.val();
      return unless !!text and e.keyCode is 13
      
      Todos.create 
         text: text

      @input.val ''

   # Clear all done todo items, destroying their models.
   clearCompleted: (e) =>
      _.each Todos.done(), (todo) -> todo.destroy()

      e.preventDefault()
      false
      
   # Lazily show the tooltip that tells you to press enter to save a new todo
   # item, after one second.
   showTooltip: (e) =>
      text = @input.val()
      placeholder = @input.attr('placeholder')
      
      $tooltip = @$('.ui-tooltip-top')
      $tooltip.fadeOut()

      clearTimeout @tooltipTimeout if !!@tooltipTimeout
      
      return if text is '' or text is placeholder

      callback = ->
         $tooltip.show().fadeIn()

      @tooltipTimeout = _.delay callback, 1000

# Attach our globals to the window.

# Finally, kick off the app
$ ->
   #window.Todo = Todo
   #window.TodoList = TodoList
   #window.TodoView = TodoView
   #window.AppView = AppView

   window.Todos = new TodoList
   window.App = new AppView

