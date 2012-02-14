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
      order: 0
     

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

   # Destroys any todos which have been completed, removes their views.
   clearCompleted: =>
      _.each @done(), (todo) -> todo.destroy()

###
Todo Item View
###

# The DOM element for a todo item...
class TodoView extends Backbone.View

   # ... is a list tag.
   tagName: 'li'

   html: '''
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

   # The view model tracks transient state such as whether we're in "edit" mode.
   viewModel: new Backbone.Model
      editing: false

   # ... is bound to the DOM, unobtrusively.  This is the equivalent of adding
   # a data-bind-view attributes to the html.
   viewModelBindings:
      'div.todo': 
         css: 
            editing: @::modelref 'editing'
      'div.todo-input':
         hasfocus:
            editing: @::modelref 'editing'

   # Listen to the DOM.
   events:
      'click div.todo-text'      : 'edit'
      'click span.todo-destroy'     : 'clear'
      'keypress .todo-input'        : 'updateOnEnter'

   # The TodoView listens for changes to its model, re-rendering.
   initialize: ->

      # Remove the view from the DOM if its model is destroyed.
      @model.on 'destroy', @remove, @

      # Monitor the editing variable, so that we can save the todo after an
      # edit.
      @viewModel.on 'change:editing', @editChanging, @

   render: =>
      # Insert the template into the DOM
      @$el.html @html

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
      console.log 'edit'
      @viewModel.set 'editing', true

   # If you hit enter, we're through editing the item.
   updateOnEnter: (e) =>
      @viewModel.set 'editing', false if e.keyCode is 13

   # Close the "editing" mode, saving changes to the todo.
   editChanging: =>
      console.log 'editChanging'
      @model.save() if !@viewModel.get 'editing'

   # Destroy the model, triggering the removal of this view.
   clear: =>
      @model.destroy()
   
###
Todo List View
###

# The DOM element for the todo list...
class TodoListView extends Backbone.View

   # is already present in the HTML
   el: $('#todo-list')

   # At initialization we bind to the relevant events on the *TodoList*
   # collection, when items are added or changed. Kick things off by loading
   # any preexisting todos that might be saved in localStorage.
   initialize: ->
      @model.on 'add', @addOne, @
      @model.on 'reset', @addAll, @

      @model.fetch()

   # Add a single todo item to the list by creating a view for it, and 
   # appending its element to the `<ul>`.
   addOne: (todo) =>
      view = new TodoView model: todo
      @$el.append(view.render().el);

   # Create views for all of the items in the *Todos* collection at once.
   addAll: =>
      @model.each @addOne

###
Summary View
###

class SummaryView extends Backbone.View

   el: $('#todo-stats')

   html: '''
   <span class="todo-count">
      <span class="number"></span>
      <span class="word"></span>
   </span>
   <span class="todo-clear">
      <a href="#">
         Clear <span class="number-done"></span>
         completed <span class="word-done"></span>
      </a>
   </span>
   '''

   # The view model used to bind transient stats to the view.
   viewModel: new Backbone.Model
      total: 0
      done: 0
      remaining: 0

   # Configure the data bindings
   viewModelBindings:
      '.todo-count': 
         visible: @::modelref 'total'
      
      '.todo-count .number':
         text: @::modelref 'remaining'
      
      '.todo-count .word':
         plural: @::modelref 'remaining'
         pluralOptions: word: 'item'
      
      '.todo-clear':
         visible: @::modelref 'done'
      
      '.todo-clear .number-done':
         text: @::modelref 'done'
      
      '.todo-count .word-done':
         plural: @::modelref 'done'
         pluralOptions: word: 'item'

   # Our model is the the shared instance of the todos collection which we
   # monitor so that we can keep the statistics up to date.
   initialize: ->
      @model.on 'all', @update, @
      @update()

   render: =>
      @$el.empty().append @html
      Backbone.outback.bind @

   remove: =>
      Backbone.outback.unbind @      

   # TODO: Improve outback support for collections so that we don't have to
   # use a view model for this.
   update: =>
      @viewModel.set
         total: @model.length
         done: @model.done().length
         remaining: @model.remaining().length

###
The Application
###

# Our overall *MainView* is the top-level piece of UI.
class MainView extends Backbone.View

   # Instead of generating a new element, bind to the existing skeleton of
   # the App already present in the HTML.
   el: $('#todoapp')

   # Delegated events for creating new items, and clearing completed ones.
   events:
      'keypress #new-todo'    : 'createOnEnter'
      'keyup #new-todo'       : 'showTooltip'
      'click .todo-clear a'   : 'clearCompleted'

   initialize: ->
      @input = @$('#new-todo')

      # Initialize the TodoList, pulling in any existing todos from storage.
      @collection = new TodoList

      # Initialize our nested views.
      @todos = new TodoListView model: @collection
      @summary = new SummaryView model: @collection

   render: =>
      @todos.render()
      @summary.render()

   remove: =>
      @todos.remove()
      @summary.remove()

   # If you hit return in the main input field, and there is text to save, 
   # create new Todo model persisting it to localStorage.
   createOnEnter: (e) =>
      text = @input.val();

      return unless !!text and e.keyCode is 13
      
      @collection.create 
         text: text, 
         order: @collection.nextOrder()

      @input.val ''

   # Clear all done todo items, destroying their models.
   clearCompleted: (e) =>
      @collection.clearCompleted()
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


class AppRouter extends Backbone.Router

   routes:
      '': 'index'

   index: ->
      @mainView = new MainView
      @mainView.render()


# Finally, kick off the app
$ ->
   window.app = new AppRouter
   Backbone.history.start()

