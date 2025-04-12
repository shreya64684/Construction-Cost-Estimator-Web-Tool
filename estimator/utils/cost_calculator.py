# estimator/utils/cost_calculator.py

# Standardized material & labor rates (can be dynamic later)
RATES = {
    'cement_per_bag': 350,
    'steel_per_kg': 65,
    'brick_rates': {
        'Clay Bricks': 6,
        'Concrete Blocks': 10,
        'Fly Ash Bricks': 8
    },
    'finishing_rates': {
        'Basic': 250,
        'Standard': 400,
        'Premium': 600
    },
    'labor_rates': {
        'Basic': 250,
        'Intermediate': 400,
        'Expert': 600
    },
    'cement_bags_per_sqft': 0.5,
    'steel_kg_per_sqft': 3.5,
    'bricks_per_sqft': 50
}


def calculate_cement_cost(area, concrete_grade):
    bags_needed = area * RATES['cement_bags_per_sqft']
    total = bags_needed * RATES['cement_per_bag']
    return round(total)


def calculate_steel_cost(area, steel_grade):
    kg_needed = area * RATES['steel_kg_per_sqft']
    total = kg_needed * RATES['steel_per_kg']
    return round(total)


def calculate_brick_cost(area, brick_type):
    bricks_needed = area * RATES['bricks_per_sqft']
    rate = RATES['brick_rates'].get(brick_type, 6)
    total = bricks_needed * rate
    return round(total)


def calculate_finishing_cost(area, finishing_type):
    rate = RATES['finishing_rates'].get(finishing_type, 250)
    return round(area * rate)


def calculate_labor_cost(hours, skill_level):
    rate = RATES['labor_rates'].get(skill_level, 250)
    return round(hours * rate)

def estimate_timeline_months(area, floors, skill_level):
    base_speed = {
        "Basic": 200, # sq ft per month
        "Intermediate": 300,
        "Expert": 400
    }
    speed = base_speed.get(skill_level, 250)
    total_area = area * floors
    months = total_area / speed
    return max(1, round(months))

def get_stage_breakdown(months):
    foundation = round(months * 0.2)
    superstructure = round(months * 0.5)
    finishing = months - foundation - superstructure
    return [
        {"stage": "Foundation", "months": foundation},
        {"stage": "Superstructure", "months": superstructure},
        {"stage": "Finishing", "months": finishing}
    ]

def get_example_monthly_costs(total_cost):
    percentages = [0.219, 0.184, 0.111, 0.169, 0.178, 0.139]
    monthly_costs = [{"month": f"Month {i + 1}", "cost": round(total_cost * p)} for i, p in enumerate(percentages)]
    monthly_percentages = [round(p * 100, 1) for p in percentages]
    return monthly_costs, monthly_percentages


def generate_estimate_data(project):
    area = project.total_area
    concrete_grade = project.concrete_grade
    steel_grade = project.steel_grade
    brick_type = project.brick_type
    finishing_type = project.finishing_type
    labor_hours = project.labor_hours
    skill_level = project.skill_level


    cement = calculate_cement_cost(area, concrete_grade)
    steel = calculate_steel_cost(area, steel_grade)
    brick = calculate_brick_cost(area, brick_type)
    finishing = calculate_finishing_cost(area, finishing_type)
    labor = calculate_labor_cost(labor_hours, skill_level)
    misc = round((cement + steel + brick + finishing + labor) * 0.1)  # 10% miscellaneous
    

    total = cement + steel + brick + finishing + labor + misc

    material_breakdown = [
        {"name": "Cement", "percent": f"{cement / total * 100:.1f}%", "amount": cement},
        {"name": "Steel", "percent": f"{steel / total * 100:.1f}%", "amount": steel},
        {"name": "Bricks", "percent": f"{brick / total * 100:.1f}%", "amount": brick},
        {"name": "Finishing", "percent": f"{finishing / total * 100:.1f}%", "amount": finishing},
        {"name": "Labor", "percent": f"{labor / total * 100:.1f}%", "amount": labor},
        {"name": "Miscellaneous", "percent": f"{misc / total * 100:.1f}%", "amount": misc},
    ]

    # monthly_costs = []
    # for i in range(6):
    #     monthly_costs.append({"month": f"Month {i + 1}", "cost": round(total / 6)})

    estimated_months = estimate_timeline_months(area, project.floors, skill_level)

    monthly_costs, monthly_percentages = get_example_monthly_costs(total)

    return {
        "total_cost": total,
        "material_breakdown": material_breakdown,
        "monthly_costs": monthly_costs,
        "estimated_months": estimate_timeline_months(area, project.floors, skill_level),
        "stage_breakdown": get_stage_breakdown(estimated_months),
        "monthly_percentages": monthly_percentages,
    }

