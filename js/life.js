var BGProcess = {};

BGProcess.LifeDisplay = function(args) {
    var ctx = args.canvas.getContext('2d'),
        size, width, height, self,
        location_lookup,
        grid_lines;

    self = {
        location_of: function(x, y) {
            return { x: Math.floor(x / width), y: Math.floor(y / height) };
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
            var i, newGrid = [], count, cell, grid = world.grid;

            population = 0;
            newGrid.length = grid.length;

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

            world = BGProcess.LifeWorld({ size: size, grid: newGrid });
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
            size = world.size;
            compute_indices();
        }
    };

    compute_indices();
    self.reset();

    return self;
};

BGProcess.Life = function(args) {
    var display = BGProcess.LifeDisplay({ canvas: args.canvas, size: 10 }),
        generation_output = args.generations,
        population_output = args.population,
        
        generation = 0,
        grid = BGProcess.GameOfLife({ size: 10 }),
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
            var location = display.location_of(x - layout.get('left'), y - layout.get('top'));
            grid.toggle(location.x, location.y);
            self.draw();
        },

        insert: function(x, y, pattern) {
            var layout = args.canvas.getLayout(),
                location = display.location_of(x - layout.get('left'), y - layout.get('top'));
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
        if (lines.length < length) {
            (length - lines.length).times(function(){
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

    return {
        id: args.id,
        name: args.name || 'Unknown',
        source: args.source,
        founder: args.founder,
        found_date: args.found_date,

        world: function() {
            var grid = [],
                lines = pattern.split('\n'),
                size = Math.max(lines.length, max_length(lines));

            pad_lines_to_length(lines, size).each(function(line) {
                pad_to_length(line, size).split('').each(function(letter) {
                    grid.push(letter === 'O' ? 1 : 0);
                });
            });

            return BGProcess.LifeWorld({ grid: grid, size: size });
        }
    };
};

BGProcess.LifeLibrary = function(args) {
    var container = args.container,
        target = args.target,
        shelf = [
            BGProcess.LifePattern({ 
                id: 1,
                source: 'http://www.argentum.freeserve.co.uk/lex_i.htm',
                pattern:
                    'O..\n' +
                    '.O..\n' +
                    '.OO.\n' +
                    '..OO',
                name: 'I-heptomino',
                founder: 'Conway'
            }),

            BGProcess.LifePattern({ 
                id: 2,
                source: 'http://www.argentum.freeserve.co.uk/lex_i.htm',
                pattern:
                    '......O.\n' +
                    '....O.OO\n' +
                    '....O.O.\n' +
                    '....O...\n' +
                    '..O.....\n' +
                    'O.O.....',
                founder: 'Paul Callahan',
                found_date: 'December 1997'
            })
        ],
        template = new Template('<div class="pattern" id="pattern_#{id}"><div class="label">#{name}</div>' +
                                '<canvas class="pattern_drawing" style="position:relative;top:0;left:0" width="210" height="210"></canvas></div>');

    function drawPattern(pattern) {
        var world = pattern.world(), canvas;

        container.insert(template.evaluate(pattern));
        canvas = container.down('#pattern_' + pattern.id + ' canvas');
        BGProcess.LifeDisplay({ canvas: canvas, size: world.size }).draw(world.grid);
        (function() { 
            new S2.UI.Behavior.Drag(canvas, { 
                onmouseup: function(e) { 
                    target.insert(e.pointerX(), e.pointerY(), pattern);
                    canvas.setStyle({ top: 0, left: 0 });
                } 
            }); 
        }).defer();
    }

    shelf.each(drawPattern);
};
