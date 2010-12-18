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

        resize: function(newSize) {
            var grid_ctx;

            size = newSize;
            width = args.canvas.width / newSize;
            height = args.canvas.height / newSize;

            location_lookup = $R(0, size * size).collect(function(index) {
                return [(index % size) * width, Math.floor(index / size) * height];
            });

            grid_lines = new Element('canvas', { width: args.canvas.width, height: args.canvas.height });
            grid_ctx = grid_lines.getContext('2d');

            grid_ctx.strokeStyle = 'lightgray';
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
    var size = args.size, grid, self,
        neighbor_lookup = [],
        population = 0;

    function wrap_boundary(val, boundary) {
        if (val === -1) { return boundary - 1; }
        if (val === boundary) { return 0; }
        return val;
    }

    function index_for(x, y) {
        return wrap_boundary(x, size) + wrap_boundary(y, size) * size;
    }

    function neighbors(index) {
        var x = index % size,
            y = Math.floor(index / size);

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

    function neighbor_count(index) {
        var list = neighbor_lookup[index];
        return grid[list[0]] + grid[list[1]] + grid[list[2]] +
               grid[list[3]]         +         grid[list[4]] + 
               grid[list[5]] + grid[list[6]] + grid[list[7]];
    }

    function empty_grid_sized(s) {
        var g = [];
        (s * s).times(function() { g.push(0); });
        return g;
    }

    self = {
        grid: function() { return grid; },
        population: function() { return population; },

        step: function step() {
            var i, newGrid = [], count, cell;
            population = 0;
            newGrid.length = grid.length;

            for (i = 0; i < grid.length; ++i) {
                cell = grid[i];
                count = neighbor_count(i);

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

            grid = newGrid;
        },

        toggle: function(x, y) {
            grid[y * size + x] = !grid[y * size + x];
        },

        reset: function() {
            grid = empty_grid_sized(size);
        },

        resize: function(newSize) {
            var safeSize = newSize * 1,
                minSize = Math.min(size, safeSize) - 1;

            newGrid = empty_grid_sized(safeSize);
            $R(0, minSize).each(function(x) {
                $R(0, minSize).each(function(y) {
                    newGrid[y * safeSize + x] = grid[index_for(x, y)];
                });
            });

            size = safeSize;
            grid = newGrid;
            compute_indices();
        }
    };

    compute_indices();
    self.reset();

    return self;
}

BGProcess.Life = function(args) {
    var display = BGProcess.LifeDisplay({ canvas: args.canvas, size: 10 }),
        generation_output = args.generations,
        population_output = args.population,
        
        generation = 0,
        grid = BGProcess.LifeWorld({ size: 10 }),
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
