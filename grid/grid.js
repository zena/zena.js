Grid = {
  grids: {},
  grid_c: 0
};

Grid.changed = function(cell, input) {
  var row = cell.up('tr');
  var table = row.up('table');
  if (cell.prev_value == input.value) return;
  if (cell.orig_value == input.value) {
    Grid.log('same', input.value);
    cell.removeClassName('changed');
    if (row.select('.changed').length == 0) {
      row.removeClassName('changed');
    }
  } else {
    cell.addClassName('changed');
    row.addClassName('changed');
  }
  var pos = Grid.pos(cell);

  var attr, id;
  if (table.grid.attr_name) {
    attr = pos;
    id = Grid.pos(row);
  } else {
    attr = table.grid.attr[pos];
    id = row.id;
  }

  var change = {
    id: id
  };
  change[attr] = input.value;
  var table = row.up('table');
  table.grid.changes.push(change);
  if (table.grid.input) {
    // single attribute table, serialize in input field
    table.grid.input.value = Grid.serialize(table);
  }
  Grid.log('changed', change);
}


Grid.close_cell = function(event) {
  var input = event.element();
  var cell = input.up();
  cell.removeClassName('input');
  cell.innerHTML = input.value;
  Grid.changed(cell, input);
}

Grid.pos = function(elem) {
  var sibl = elem.up().childElements();
  for (var i = 0; i < sibl.length; i++) {
    if (sibl[i] === elem) return i;
  }
}

Grid.keydown = function(event) {
  var input = event.element();
  var key = event.keyCode;
  var cell = input.up();
  if (key == 39 || (key == 9 && !event.shiftKey)) {
    // tab + key right
    var next = cell.nextSiblings()[0];
    if (!next || next.hasClassName('action')) {
      // wrap around on tab
      var row = cell.up('tr').nextSiblings()[0];
      if (!row) {
        row = cell.up('tbody').childElements()[1];
      }
      next = row.childElements()[0];
    }
    Grid.open_cell(next);
    event.stop();
  } else if (key == 37 || (key == 9 && event.shiftKey)) {
    var prev = cell.previousSiblings()[0];
    if (!prev) {
      // wrap back around on shift+tab
      var row = cell.up('tr').previousSiblings()[0];
      if (!row || row.childElements()[0].tagName == 'TH') {
        row = cell.up('tbody').childElements().last();
      }
      prev = row.childElements().last();
      if (prev.hasClassName('action'))
        prev = prev.previousSiblings()[0];
    }
    Grid.open_cell(prev);
    event.stop();
  } else if (key == 40) {
    // find position
    var pos = Grid.pos(cell);
    // go to next row
    var row = cell.up().nextSiblings().first();
    // find elem
    var next = row.childElements()[pos];
    Grid.open_cell(next);
    event.stop();
  } else if (key == 38) {
    // find position
    var pos = Grid.pos(cell);
    // go to prev row
    var row = cell.up().previousSiblings().first();
    // find elem
    var next = row.childElements()[pos];
    Grid.open_cell(next);
    event.stop();
  }
  return false;
}

Grid.open_cell = function(cell) {
  if (cell.hasClassName('input')) return;
  var value = cell.innerHTML;

  if (!cell.orig_value) cell.orig_value = value;
  cell.prev_value = value;

  var w = cell.getWidth() - 5;
  var h = cell.getHeight() - 5;
  cell.addClassName('input');
  cell.innerHTML = "<input type='text' value=''/>";
  var input = cell.select('input').first();
  input.value = value;
  input.setStyle({
    width: w + 'px',
    height: h + 'px'
  });
  input.observe('blur', Grid.close_cell);
  input.observe('keydown', Grid.keydown);
  input.focus();
  input.select();
}

Grid.click = function(event) {
  var cell = event.findElement('td') || event.findElement('th');
  if (cell.hasClassName('action')) {
    Grid.action(event);
  } else {
    Grid.open_cell(cell);
  }
}

Grid.action = function(event) {
  var span = event.findElement('span');
  var row = event.findElement('tr');
  var table = event.findElement('table');
  if (span.hasClassName('add')) {
    // insert row below
    var new_row = '<tr>';
    var cells = row.childElements();
    for (var i = 0; i < cells.length -1; i++) {
      new_row = new_row + '<td></td>';
    }
    new_row = new_row + Grid.Buttons + '</tr>';
    row.insert({
      after: new_row
    });
    var new_row = row.nextSiblings()[0];
    Grid.open_cell(new_row.childElements()[0]);
    // TODO: rewrite history (+ push event in history for undo)
  } else if (span.hasClassName('del')) {
    // remove current row
    row.remove();
  }
  table.grid.input.value = Grid.serialize(table);
}

// map grid position to attribute and reverse.
Grid.makeAttrPos = function(table) {
  var heads = table.childElements()[0].select('th');
  var attr = {};
  var pos = {};
  table.grid.attr = attr;
  table.grid.pos = pos;
  if (table.grid.attr_name) {
    for (var i = 0; i < heads.length; i++) {
      attr[i] = i;
      pos[i] = i;
    }
  } else {
    for (var i = 0; i < heads.length; i++) {
      var attr_name = heads[i].getAttribute('data-a');
      attr[i] = attr_name;
      pos[attr_name] = i;
    }
  }
}

// only used with single attr table
Grid.serialize = function(table) {
  var data = [];
  var rows = table.childElements()[0].select('tr');
  for (var i = 0; i < rows.length; i++) {
    var row_data = [];
    var cells = rows[i].childElements();
    for (var j = 0; j < cells.length - 1; j++) {
      var cell = cells[j];
      if (cell.hasClassName('input')) {
        row_data.push(cell.select('input').first().value);
      } else {
        row_data.push(cells[j].innerHTML);
      }
    }
    data.push(row_data);
  }
  return Object.toJSON(data);
}

Grid.Buttons = "<td class='action'><span class='add'>add</a> <span class='del'>del</a></td>";

// only used with single attr table
Grid.addButtons = function(table) {
  var data = [];
  var rows = table.childElements()[0].select('tr');
  for (var i = 0; i < rows.length; i++) {
    var buttons;
    if (i == 0) {
      buttons = "<td class='action'><span class='add'>add</span></td>";
    } else {
      buttons = Grid.Buttons;
    }
    var row = rows[i];
    row.insert({
      bottom: buttons
    });
  }
  return data;
}

Grid.make = function(table) {
  Grid.grid_c++;
  Grid.grids[Grid.grid_c] = table;
  table.grid = {
    changes: []
  };
  // Detect type.
  table.grid.attr_name = table.getAttribute('data-a');

  Grid.makeAttrPos(table);

  if (table.grid.attr_name) {
    // If we have an attr_name, rows and columns are
    // serialized as json in a single field.
    Grid.addButtons(table);
    table.insert({
      after: "<textarea id='grid_a_" + Grid.grid_c + "' name='" + table.grid.attr_name + "'/>"
    });
    table.grid.input = $("grid_a_" + Grid.grid_c);
    table.grid.input.value = Grid.serialize(table);
  } else {
    // Otherwise each row is a new object and each column
    // corresponds to a different attribute (defined in the 
    // 'th' of the table).
    table.insert({
      after: "<p class='grid_btn'><a class='save' href='javascript:' onclick='Grid.save(" + Grid.grid_c + ")'>save</a> <a class='undo' href='javascript:' onclick='Grid.undo(" + Grid.grid_c + ")'>undo</a></p>"
    });
  }


  table.observe('click', Grid.click);
}

Grid.save = function(grid_id) {
  var table = Grid.grids[grid_id];
  var data = {};
  data[grid_id] = Grid.compact(table.grid.changes);
  // PUT changes
  // ... We would trigger Ajax call here
  new Ajax.Request("/echo/json/", {
    parameters: {
      json:Object.toJSON(data)
    },
      onSuccess: function(transport) {
        Grid.notify(transport.responseJSON);
      },
      method: 'post'
  });
  // MOCK by receiving sent data
  //Grid.notify(data);
}

Grid.undo = function(grid_id) {
  var table = Grid.grids[grid_id];
  var change = table.grid.changes.pop();
  // TODO: could be optimized
  var state = Grid.compact(table.grid.changes)[change.id] || {};
  for (attr in change) {
    if (attr == 'id') continue;
    var cell = $(change.id).childElements()[table.grid.pos[attr]];
    var value = state[attr] || cell.orig_value;
    cell.innerHTML = value;
    cell.prev_value = value;
    if (value == cell.orig_value) {
      cell.removeClassName('changed');
      var row = cell.up();
      if (row.select('.changed').length == 0) row.removeClassName('changed');
    } else {[cell, cell.up()].invoke('addClassName', 'changed');
    }
    cell.addClassName('undone');
  }
  new PeriodicalExecuter(function(pe) {
    table.select('.undone').invoke('removeClassName', 'undone');
    pe.stop();
  }, 1);
}

Grid.compact = function(list) {
  var res = {};
  for (var i = list.length - 1; i >= 0; i--) {
    var changes = list[i];
    var obj = res[changes.id];
    if (!obj) {
      obj = {};
      res[changes.id] = obj;
    }

    for (var key in changes) {
      if (key != 'id' && !obj[key]) {
        // only take latest change
        obj[key] = changes[key];
      }
    }
  }
  return res;
}

Grid.log = function(msg, data) {

  $('log').insert({
    top: "<li>" + msg + ": " + Object.toJSON(data) + "</li>"
  });
}

Grid.notify = function(data) {
  for (var i in data) {
    var table = Grid.grids[parseInt(i)];
    var rows = table.childElements()[0].select('tr');
    var changes = data[i];
    for (var obj_id in changes) {
      var row = $(obj_id) || rows[parseInt(obj_id)];
      var cells = row.childElements();
      var change = changes[obj_id];
      for (var attr in change) {
        if (attr == 'id') continue;
        var cell;
        cell = cells[table.grid.pos[attr]];
        cell.removeClassName('changed');
        cell.innerHTML = change[attr];
        cell.orig_value = change[attr];
        cell.prev_value = undefined;
        cell.addClassName('saved');
      }
      if (row.select('.changed').length == 0) {

        row.removeClassName('changed');
      }
    }
  }
  // later
  new PeriodicalExecuter(function(pe) {
    table.select('.saved').invoke('removeClassName', 'saved');
    pe.stop();
  }, 1);
  // maybe this is not good
  table.grid.changes = []; // clear
  Grid.log('notify', data);
}


$$('.grid').each(function(e) {
  Grid.make(e);
});

// TODO: detect tab and arrows to move between cells.

