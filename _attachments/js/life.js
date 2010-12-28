var BGProcess = {};

BGProcess.LifeDisplay = function(args) {
    var ctx = args.canvas.getContext('2d'),
        size, width, height, self,
        location_lookup,
        grid_lines;

    self = {
        location_of: function(x, y) {
            var layout = args.canvas.getLayout();
            return { x: Math.floor((x - layout.get('left')) / width), y: Math.floor((y - layout.get('top')) / height) };
        },

        contains: function(x, y) {
            var layout = args.canvas.getLayout();

            return x >= layout.get('left') && x <= layout.get('left') + layout.get('width') &&
                   y >= layout.get('top') && y <= layout.get('top') + layout.get('height');
        },

        draw: function draw(grid) {
            var i, x, y;
            ctx.clearRect(0, 0, args.canvas.width, args.canvas.height);

            ctx.fillStyle = '#33FF33';
            for (i = 0; i < grid.length; ++i) {
                if (grid[i]) {
                    x = location_lookup[i][0];
                    y = location_lookup[i][1];
                    ctx.fillRect(x, y, width, height);
                }
            }

            ctx.drawImage(grid_lines, 0, 0);
        },

        resize: function(new_size) {
            var grid_ctx;

            size = new_size;
            width = args.canvas.width / new_size;
            height = args.canvas.height / new_size;

            location_lookup = $R(0, size * size).collect(function(index) {
                return [(index % size) * width, Math.floor(index / size) * height];
            });

            grid_lines = new Element('canvas', { width: args.canvas.width, height: args.canvas.height });
            grid_ctx = grid_lines.getContext('2d');

            grid_ctx.strokeStyle = 'lightgray';
            grid_ctx.lineWidth = 0.25;
            grid_ctx.beginPath();
            $R(0, size + 1).each(function(line) {
                grid_ctx.moveTo(line * width, 0); 
                grid_ctx.lineTo(line * width, args.canvas.height); 

                grid_ctx.moveTo(0, line * height); 
                grid_ctx.lineTo(args.canvas.width, line * height); 
            });
            grid_ctx.stroke();
        }
    };

    self.resize(args.size);
    return self;
};

BGProcess.LifeWorld = function(args) {
    function empty_grid_sized(s) {
        var g = [];
        (s * s).times(function() { g.push(0); });
        return g;
    }

    function wrap_boundary(val, boundary) {
        if (val === -1) { return boundary - 1; }
        if (val === boundary) { return 0; }
        return val;
    }

    return {
        grid: args.grid || empty_grid_sized(args.size),
        size: args.size,

        index_for: function(x, y) {
            return wrap_boundary(x, this.size) + wrap_boundary(y, this.size) * this.size;
        },

        alive: function(x, y) {
            return this.grid[this.index_for(x, y)];
        },

        toggle: function(x, y) {
            var index = y * this.size + x;
            if (this.grid[index]) {
                this.grid[index] = 0;
            } else {
                this.grid[index] = 1;
            }
        },

        blit: function(x, y, pattern) {
            var self = this, 
                otherWorld = pattern.world(),
                width = Math.min(this.size, x + otherWorld.size) - 1,
                height = Math.min(this.size, y + otherWorld.size) - 1;

            $R(x, width).each(function(dx) {
                $R(y, height).each(function(dy) {
                    self.grid[dy * self.size + dx] = otherWorld.alive(dx - x, dy - y);
                });
            });
        },

        reset: function() {
            this.grid = empty_grid_sized(this.size);
        },

        resize: function(new_size) {
            var self = this, 
                new_grid, 
                min_size = Math.min(this.size, new_size) - 1;

            new_grid = empty_grid_sized(new_size);
            $R(0, min_size).each(function(x) {
                $R(0, min_size).each(function(y) {
                    new_grid[y * new_size + x] = self.alive(x, y);
                });
            });

            this.size = new_size;
            this.grid = new_grid;
        }
    };
};

BGProcess.GameOfLife = function(args) {
    var size = args.size, 
        world = BGProcess.LifeWorld({ size: size }),
        oldWorld = BGProcess.LifeWorld({ size: size }),
        self,
        neighbor_lookup = [],
        population;

    function neighbors(index) {
        var x = index % size,
            y = Math.floor(index / size),
            index_for = world.index_for.bind(world);

        return [index_for(x - 1, y - 1), index_for(x, y - 1), index_for(x + 1, y - 1),
                index_for(x - 1, y),                          index_for(x + 1, y),
                index_for(x - 1, y + 1), index_for(x, y + 1), index_for(x + 1, y + 1)];
    }

    function compute_indices() {
        neighbor_lookup = [];
        $R(0, size * size).each(function(index) {
            neighbor_lookup.push(neighbors(index));
        });
    }

    function neighbor_count(grid, index) {
        var list = neighbor_lookup[index];

        return grid[list[0]] + grid[list[1]] + grid[list[2]] +
               grid[list[3]]         +         grid[list[4]] + 
               grid[list[5]] + grid[list[6]] + grid[list[7]];
    }

    self = {
        grid: function() { return world.grid; },
        population: function() { return population; },

        step: function step() {
            var i, newGrid = oldWorld.grid, count, cell, grid = world.grid, tmp;

            population = 0;
            for (i = 0; i < grid.length; ++i) {
                cell = grid[i];
                count = neighbor_count(grid, i);

                if (cell && count < 2) {
                    newGrid[i] = 0;
                } else if (cell && count <= 3) {
                    population += 1;
                    newGrid[i] = 1;
                } else if (cell) {
                    newGrid[i] = 0;
                } else if (!cell && count === 3) {
                    population += 1;
                    newGrid[i] = 1;
                } else {
                    newGrid[i] = 0; 
                }
            }

            tmp = world;
            world = oldWorld;
            oldWorld = tmp;
        },

        toggle: function(x, y) {
            world.toggle(x, y);
            if (world.alive(x, y)) {
                population += 1;
            } else {
                population -= 1;
            }
        },

        blit: function(x, y, pattern) {
            world.blit(x, y, pattern);
        },

        reset: function() {
            world.reset();
            population = 0;
        },

        resize: function(new_size) {
            world.resize(new_size * 1);
            oldWorld = BGProcess.LifeWorld({ size: new_size * 1 });
            size = world.size;
            compute_indices();
        }
    };

    compute_indices();
    self.reset();

    return self;
};

BGProcess.Life = function(args) {
    var display = args.display,
        generation_output = args.generations,
        population_output = args.population,
        
        generation = 0,
        grid = BGProcess.GameOfLife({ size: args.size }),
        self;

    self = {
        step: function() {
            generation += 1;
            grid.step();
            self.draw();
        },

        draw: function() {
            display.draw(grid.grid());
            generation_output.update(generation);
            population_output.update(grid.population());
        },

        start: function() {
            if (!this.exec) {
                this.exec = new PeriodicalExecuter(self.step.bind(self), 0.1);
            }
        },

        stop: function() {
            if (this.exec) {
                this.exec.stop();
                this.exec = null;
            }
        },

        reset: function() {
            grid.reset();
            generation = 0;
            self.draw();
        },

        spawn: function(x, y) {
            var location = display.location_of(x, y);
            grid.toggle(location.x, location.y);
            self.draw();
        },

        insert: function(x, y, pattern) {
            var location = display.location_of(x, y);
            if (display.contains(x, y)) {
                grid.blit(location.x, location.y, pattern);
                self.draw();
            }
        },

        resize: function(size) {
            grid.resize(size);
            display.resize(size);
            self.draw();
        }
    };

    self.reset();
    self.draw();

    return self;
};

BGProcess.LifePattern = function(args) {
    var pattern = args.pattern;

    function max_length(items) {
        return Math.max.apply(null, items.collect(function(e) { return e.length; }));
    }

    function empty_line_lengthed(length) {
        var line = [];
        length.times(function() { line.push('.'); });
        return line.join('');
    }

    function pad_lines_to_length(lines, length) {
        var diff = (length - lines.length)/2;
        if (lines.length < length) {
            Math.ceil(diff).times(function(){
                lines.unshift(empty_line_lengthed(length));
            });
            Math.floor(diff).times(function(){
                lines.push(empty_line_lengthed(length));
            });
        }

        return lines;
    }

    function pad_to_length(line, length) {
        if (line.length < length) {
            (length - line.length).times(function() {
                line += '.';
            });
        }

        return line;
    }

    function normalize(pattern) {
        var lines = pattern.split('\n'),
            size = Math.max(lines.length, max_length(lines)),
            normalized = [];

        pad_lines_to_length(lines, size).each(function(line) {
            normalized.push(pad_to_length(line, size))
        });

        return normalized.join('\n');
    }

    return {
        _id: args._id,
        name: args.name || 'Unknown',
        pattern: normalize(args.pattern),
        source: args.source,
        founder: args.founder || 'Unknown',
        found_date: args.found_date || 'Unknown',

        identify: function() {
            if (this._id) {
                return this._id;
            }

            throw "no identifier yet assigned!";
        },

        data: function() {
            return {
                _id: this._id,
                name: this.name,
                pattern: this.pattern,
                source: this.source,
                founder: this.founder,
                found_date: this.found_date
            };
        },

        rotate: function() {
            var lines = this.pattern.split('\n'),
                new_lines = [];

            $R(1, lines.length).each(function(index) { 
                new_lines.push(lines.collect(function(line) { return line.substr(line.length - index, 1); }).join('')); 
            });

            this.pattern = new_lines.join('\n');
        },

        world: function() {
            var grid = [],
                lines = this.pattern.split('\n');

            lines.each(function(line) {
                line.split('').each(function(letter) {
                    grid.push(letter === 'O' ? 1 : 0);
                });
            });

            return BGProcess.LifeWorld({ grid: grid, size: lines.length });
        }
    };
};

BGProcess.PatternLibrary = function() {
    function is_pattern(doc) {
        return !!doc.pattern;
    }

    var db = new CouchDB('life'),
        MAX_RESULTS = 7;
        
    return {
        insert: function(pattern) {
            var data = pattern.data();
            db.save(data);
            pattern._id = data._id;
        },

        patterns: function(continuation, tag) {
            var startdoc = continuation || '',
                start_tag = tag.strip() || '',
                end_tag = tag.strip() ? tag.strip() + '\u9999' : '',
                docs = db.view('life/patterns', { reduce: false, startkey_docid: startdoc, startkey: start_tag, endkey: end_tag, limit: MAX_RESULTS });
                results = {
                    continuation: docs.rows.length === MAX_RESULTS ? docs.rows.last().id : undefined,
                    patterns: docs.rows.pluck('value').collect(BGProcess.LifePattern)
                };

            if (results.patterns.length === MAX_RESULTS) {
                results.patterns.pop();
            }

            return results;
        }
    };
};

BGProcess.Dialog = function(args) {
    var title = args.title,
        content = args.content,
        buttons = args.buttons || [{ label: 'Close', action: function() { this.close(); } }],
        dialog_template = new Template('<div class="ui-dialog"><div class="ui-dialog-titlebar">#{title}</div>' +
                                       '<div class="ui-dialog-content">#{content}</div>' +
                                       '<div class="ui-dialog-buttonpane"></div></div>'),
        container = new Element('div').update(dialog_template.evaluate({ title: title, content: content })),
        win = Control.Window.open(container, { 
            draggable: container.down('.ui-dialog-titlebar'),
            afterClose: container.remove.bind(container)
        });

    document.body.appendChild(container);

    buttons.each(function(button) {
        container.down('.ui-dialog-buttonpane').insert(
            new Element('button', { type: 'button' })
                .insert(button.label)
                .observe('click', function() {
                    button.action.call(win);
                }));
    });

    return win;
};

BGProcess.NewPatternDialog = function(onSave) {
    var info_template = new Template('<pre>#{pattern}</pre>' +
                                     '<dl><dt>Name<dt><dd>#{name}</dd><dt>Founder</dt><dd>#{founder}</dd><dt>Found on</dt><dd>#{found_date}</dd></dl>');
    return BGProcess.Dialog({
        title: 'Add Pattern Info', 
        content: info_template.evaluate({
            name: '<input class="name">',
            founder: '<input class="founder">',
            found_date: '<input class="found_date">',
            pattern: '<textarea rows="10" class="pattern"></textarea>'
        }),
        buttons: [{
            label: 'Save',
            action: function() {
                var element = this.container, doc;
                if($F(element.down('.pattern')).blank()) {
                    return;
                }

                doc = { 
                    founder: $F(element.down('.founder')).strip(),
                    found_date: $F(element.down('.found_date')).strip(),
                    pattern: $F(element.down('.pattern')).strip(),
                    name: $F(element.down('.name')).strip()
                };
                onSave(BGProcess.LifePattern(doc));

                this.close();
            }
        },
        {
            label: 'Cancel',
            action: function() {
                this.close();
            }
        }]
    });
};

BGProcess.ViewPatternDialog = function(pattern) {
    var info_template = new Template('<pre>#{pattern}</pre>' +
                                     '<dl><dt>Name<dt><dd>#{name}</dd><dt>Founder</dt><dd>#{founder}</dd><dt>Found on</dt><dd>#{found_date}</dd></dl>');
    return BGProcess.Dialog({ title: 'Pattern Info', content: info_template.evaluate(pattern) });
};

BGProcess.LibraryPattern = function(target, pattern) {
    var template = new Template('<li class="pattern" id="pattern_#{_id}"><div class="rotate">&#8634;</div><div class="info">?</div><div class="label">#{name}</div>' +
                                '<canvas class="pattern_drawing" style="position:relative;top:0;left:0" width="100" height="100"></canvas></li>'),
        display, dialog, container = new Element('div'),
        id = 'pattern_' + pattern.identify();

    container.insert(template.evaluate(pattern));

    display = BGProcess.LifeDisplay({ canvas: container.down('#' + id + ' canvas'), size: pattern.world().size });
    container.down('#' + id).on('mouseenter', function() {
        container.down('#' + id + ' .info').show();
        container.down('#' + id + ' .rotate').show();
    });
    container.down('#' + id).on('mouseleave', function() {
        container.down('#' + id + ' .info').hide();
        container.down('#' + id + ' .rotate').hide();
    });
    container.down('#' + id + ' .info').hide().on('click', function() {
        if (dialog) {
            dialog.close();
            dialog.element.remove();
        }
        dialog = BGProcess.ViewPatternDialog(pattern);
        dialog.open();
    });
    container.down('#' + id + ' .rotate').hide().on('click', function() {
        pattern.rotate(); 
        display.draw(pattern.world().grid);
    });

    display.draw(pattern.world().grid);
    (function() { 
        new Draggable(container.down('#' + id + ' canvas'), { 
            revert: true,
            onEnd: function(drag, e) { 
                target.insert(e.pointerX(), e.pointerY(), pattern);
                e.element().setStyle({ top: 0, left: 0 });
            } 
        }); 
    }).defer();  // Have to defer or else we don't have the right coordinates for some reason

    return {
        toElement: function() { return container; }
    };
};

BGProcess.LifeLibraryView = function(args) {
    var container = new Element('div'),
        listing = new Element('ul'),
        library = args.library,
        target = args.target,
        next, previous = [], current = '', term = '', self;

    self = {
        toElement: function() { return container; },

        new_pattern: function() {
            var dialog = BGProcess.NewPatternDialog(function(pattern) {
                library.insert(pattern);
                self.reset(term);
            });
            dialog.open();
        },

        reset: function(search_term) {
            previous = [];
            current = '';
            next = undefined;
            term = search_term;
            self.search(current);
        },

        search: function(continuation) {
            var results = library.patterns(continuation, term);
            next = results.continuation;
            self.show(results.patterns);
        },

        show: function(patterns) {
            listing.update('');
            patterns.collect(BGProcess.LibraryPattern.curry(target)).each(Element.insert.curry(listing));
        },

        next_page: function() {
            if (next) {
                previous.push(current);
                current = next;
                self.search(current);
            }
        },

        previous_page: function() {
            if (previous.length) {
                current = previous.pop();
                self.search(current);
            } else {
                current = '';
                self.search('');
            }
        }
    };

    container.insert(listing);
        
    self.reset('');

    return self;
};
