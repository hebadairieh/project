var BubbleChart, root,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };



BubbleChart = (function() {
  function BubbleChart(data) {
    this.hide_details = __bind(this.hide_details, this);
    this.show_details = __bind(this.show_details, this);
    this.hide_years = __bind(this.hide_years, this);
    this.display_years = __bind(this.display_years, this);
    this.move_towards_year = __bind(this.move_towards_year, this);
    this.display_by_year = __bind(this.display_by_year, this);
    this.move_towards_center = __bind(this.move_towards_center, this);
    this.display_group_all = __bind(this.display_group_all, this);
    this.start = __bind(this.start, this);
    this.create_vis = __bind(this.create_vis, this);
    this.create_nodes = __bind(this.create_nodes, this);

    var max_num_projects;
    this.max_life_cost;
    this.min_life_cost;
    this.agencies = d3.nest()
                      .key(function(d) { return d["Agency_Code"]})
                      .rollup(function(leaves) { return leaves.length; })
                      .entries(data);

    this.data = data;
    this.width = 940;
    this.height = 650;
    this.tooltip = CustomTooltip("gates_tooltip", 240);
    this.center = {
      x: this.width / 2,
      y: this.height / 2
    };
    this.year_centers = {
      "Under Budget": {
        x: this.width / 3,
        y: this.height / 2
      },
      "On Budget": {
        x: this.width / 2,
        y: this.height / 2
      },
      "Over Budget": {
        x: 2 * this.width / 3,
        y: this.height / 2
      }
    };
    this.layout_gravity = -0.02;
    this.damper = 0.1;
    this.vis = null;
    this.nodes = [];
    this.force = null;
    this.circles = null;
    this.avg_life_cost=(this.min_life_cost+this.max_num_projects)/2;
    
   // this.fill_color = d3.scale.ordinal().domain([this.min_life_cost,(this.min_life_cost+this.avg_life_cost)/2,this.avg_life_cost,(this.avg_life_cost+this.max_life_cost)/2,this.max_life_cost]).range(["#FFCCCC","#FF9999", "#FF6666","#FF3333","#FF0000"]);
    this.fill_color;

    max_num_projects = d3.max(this.agencies, function(d) {
      return d.values;
    });


    this.radius_scale = d3.scale.pow().exponent(0.5).domain([0,max_num_projects]).range([6,95]);

    this.create_nodes();
    this.create_vis();


  }
  //end of bubble chart

  BubbleChart.prototype.create_nodes = function() {
    var agencies_array_detail = [];
    this.agencies.forEach((function(_this){
      var agencyprojects;
      var agency;
      return function(d){
        agencyprojects = _this.data.filter(function(a) {
          return a['Agency_Code'] == d.key;
        });

        var totalagency = 0;
        for (var j = 0; j < agencyprojects.length; j++) {
          totalagency+= ~~agencyprojects[j]["Project_LifeCycle_Cost"];

         }
        var total_cost_variance= 0;
        var cost_var_category;

        for (var h = 0; h< agencyprojects.length; h++) {
          total_cost_variance+= ~~agencyprojects[h]["Cost_Variance_mil"];
        }

       if (total_cost_variance==0){
        cost_var_category="On Budget";
        } else {
          if (total_cost_variance>0){
            cost_var_category="Under Budget";
          } else{
            cost_var_category="Over Budget";
          }
        }

        // console.log(cost_var_category);



        agency = {
          id: d.key,
          projects: agencyprojects,
          total: totalagency,
          radius:  _this.radius_scale(d.values),
          name: agencyprojects[0]["Agency_Name"],
          cost_variance:total_cost_variance,
          cost_category : cost_var_category,
          x: Math.random() * 900,
          y: Math.random() * 800
        };


        return agencies_array_detail.push(agency);

      };//enf of foreach
    })(this));
    this.nodes = agencies_array_detail;
    this.max_life_cost= d3.max(this.nodes, function(d) {
      return d.total;
    });


    this.min_life_cost=d3.min(this.nodes, function(d) {
      return d.total;
   });
    this.fill_color=d3.scale.log().domain([this.min_life_cost,this.max_life_cost]);
    this.fill_color.domain([0,0.25,0.5,0.75,1].map(this.fill_color.invert));
    this.fill_color.range(["#FFDFE1","#FF9999", "#FF6666","#FF3333","#CC0707"]);


    return this.nodes.sort(function(a, b) {
      return b.value - a.value;
    });


  };

  BubbleChart.prototype.create_vis = function() {
    var that;
    this.vis = d3.select("#vis").append("svg").attr("width", this.width).attr("height", this.height).attr("id", "svg_vis");
    this.circles = this.vis.selectAll("circle").data(this.nodes, function(d) {
      return d.id;
    });
    that = this;
    this.circles.enter().append("circle").attr("r", 0).attr("fill", (function(color) {
      return function(d) {
        return color.fill_color(d.total);
      };
    })(this)).attr("stroke-width", 2).attr("stroke", (function(_this) {
      return function(d) {
        return d3.rgb(_this.fill_color(d.to)).brighter();
      };
    })(this)).attr("id", function(d) {
      return "bubble_" + d.id;
    }).on("mouseover", function(d, i) {
      return that.show_details(d, i, this);
    }).on("mouseout", function(d, i) {
      return that.hide_details(d, i, this);
    });
    return this.circles.transition().duration(2000).attr("r", function(d) {
      return d.radius;
    });
  };

  BubbleChart.prototype.charge = function(d) {
    return -Math.pow(d.radius, 2.0) / 8;
  };

  BubbleChart.prototype.start = function() {
    return this.force = d3.layout.force().nodes(this.nodes).size([this.width, this.height]);
  };

  BubbleChart.prototype.display_group_all = function() {
    this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", (function(_this) {
      return function(e) {
        return _this.circles.each(_this.move_towards_center(e.alpha)).attr("cx", function(d) {
          return d.x;
        }).attr("cy", function(d) {
          return d.y;
        });
      };
    })(this));
    this.force.start();
    return this.hide_years();
  };

  BubbleChart.prototype.move_towards_center = function(alpha) {
    return (function(_this) {
      return function(d) {
        d.x = d.x + (_this.center.x - d.x) * (_this.damper + 0.02) * alpha;
        return d.y = d.y + (_this.center.y - d.y) * (_this.damper + 0.02) * alpha;
      };
    })(this);
  };

  BubbleChart.prototype.display_by_year = function() {
    this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", (function(_this) {
      return function(e) {
        return _this.circles.each(_this.move_towards_year(e.alpha)).attr("cx", function(d) {
          return d.x;
        }).attr("cy", function(d) {
          return d.y;
        });
      };
    })(this));
    this.force.start();
    return this.display_years();
  };

  BubbleChart.prototype.move_towards_year = function(alpha) {
    return (function(_this) {
      return function(d) {
        var target;
        target = _this.year_centers[d.cost_category];
        d.x = d.x + (target.x - d.x) * (_this.damper + 0.02) * alpha * 1.1;
        return d.y = d.y + (target.y - d.y) * (_this.damper + 0.02) * alpha * 1.1;
      };
    })(this);
  };

  BubbleChart.prototype.display_years = function() {
    var years, years_data, years_x;
    years_x = {
      "Under Budget": 160,
      "Within Budget": this.width / 2,
      "Over Budget": this.width - 160
    };
    years_data = d3.keys(years_x);
    years = this.vis.selectAll(".years").data(years_data);
    return years.enter().append("text").attr("class", "years").attr("x", (function(_this) {
      return function(d) {
        return years_x[d];
      };
    })(this)).attr("y", 40).attr("text-anchor", "middle").text(function(d) {
      return d;
    });
  };

  BubbleChart.prototype.hide_years = function() {
    var years;
    return years = this.vis.selectAll(".years").remove();
  };

  BubbleChart.prototype.show_details = function(data, i, element) {
    var content;
    d3.select(element).attr("stroke", "black");
    content = "<span class=\"name\">Agency Name :</span><span class=\"value\"> " + data.name + "</span><br/>";
    content += "<span class=\"name\">Total lifeCycle Cost:</span><span class=\"value\"> $" + (addCommas(data.total)) + "m</span><br/>";
    content += "<span class=\"name\">Number of Projects:</span><span class=\"value\"> " + data. projects. length + "</span>";
    return this.tooltip.showTooltip(content, d3.event);
  };

  BubbleChart.prototype.hide_details = function(data, i, element) {
    d3.select(element).attr("stroke", (function(_this) {
      return function(d) {
        return d3.rgb(_this.fill_color(d.group)).darker();
      };
    })(this));
    return this.tooltip.hideTooltip();
  };

  return BubbleChart;

})();

root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function() {
  var chart, render_vis;
  chart = null;
  render_vis = function(csv) {


    chart = new BubbleChart(csv);
    chart.start();
    return root.display_all();
  };
  root.display_all = (function(_this) {
    return function() {
      return chart.display_group_all();
    };
  })(this)
  root.display_year = (function(_this) {
    return function() {
      return chart.display_by_year();
    };
  })(this);
  root.toggle_view = (function(_this) {
    return function(view_type) {
      if (view_type === 'year') {
        return root.display_year();
      } else {
        return root.display_all();
      }
    };
  })(this);
  return d3.csv("data/Projects.csv", render_vis);

  });