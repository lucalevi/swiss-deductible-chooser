import numpy as np
import matplotlib

matplotlib.use("Agg")  # Non-interactive backend for web
import matplotlib.pyplot as plt
import io

DEDUCTIBLE = [300, 500, 1000, 1500, 2000, 2500]
CO_INSURANCE = 700

# Translation dictionary for all text elements
TRANSLATIONS = {
    "en": {
        "title": "Swiss Health Insurance Costs by Deductible",
        "xlabel": "Yearly Health Costs [CHF]",
        "ylabel": "Total Insurance Costs\n(Premiums + Deductible + Co-insurance) [CHF]",
        "legend_title_no_dominant": "Deductible Options",
        "legend_title_dominant": "Deductible Options (* = Always Optimal)",
        "optimal_text": "Optimal: {deductible} CHF",
        "break_even_label": "Break-even Point (~{cost:.0f} CHF)",
        "dominant_text": "* CHF {deductible} deductible is optimal across all health cost levels",
    },
    "de": {
        "title": "Schweizer Krankenversicherungskosten nach Franchise",
        "xlabel": "Jährliche Gesundheitskosten [CHF]",
        "ylabel": "Gesamte Versicherungskosten\n(Prämien + Franchise + Selbstbehalt) [CHF]",
        "legend_title_no_dominant": "Franchise-Optionen",
        "legend_title_dominant": "Franchise-Optionen (* = Immer Optimal)",
        "optimal_text": "Optimal: {deductible} CHF",
        "break_even_label": "Break-even-Punkt (~{cost:.0f} CHF)",
        "dominant_text": "* CHF {deductible} Franchise ist bei allen Gesundheitskosten optimal",
    },
    "fr": {
        "title": "Coûts de l'assurance maladie suisse par franchise",
        "xlabel": "Coûts de santé annuels [CHF]",
        "ylabel": "Coûts totaux de l'assurance\n(Primes + Franchise + Participation) [CHF]",
        "legend_title_no_dominant": "Options de franchise",
        "legend_title_dominant": "Options de franchise (* = Toujours optimal)",
        "optimal_text": "Optimal : {deductible} CHF",
        "break_even_label": "Point d'équilibre (~{cost:.0f} CHF)",
        "dominant_text": "* CHF {deductible} franchise est optimale pour tous les niveaux de coûts de santé",
    },
    "it": {
        "title": "Costi dell'assicurazione sanitaria svizzera per franchigia",
        "xlabel": "Costi sanitari annuali [CHF]",
        "ylabel": "Costi totali dell'assicurazione\n(Premi + Franchigia + Partecipazione) [CHF]",
        "legend_title_no_dominant": "Franchige",
        "legend_title_dominant": "Franchige (* = Sempre ottimale)",
        "optimal_text": "Ottimale: {deductible} CHF",
        "break_even_label": "Punto di break-even (~{cost:.0f} CHF)",
        "dominant_text": "* CHF {deductible} franchigia è ottimale per tutti i costi sanitari.",
    },
}


def find_optimal_transitions(premiums):
    """Find all transition points where the optimal deductible changes."""
    yearly_premium = np.array(premiums) * 12
    yearly_costs = np.arange(0, 10001, 1)

    out_of_pocket_costs = np.array(
        [
            np.minimum(yearly_costs, ded)
            + np.where(
                yearly_costs > ded,
                np.minimum(0.1 * (yearly_costs - ded), CO_INSURANCE),
                0,
            )
            for ded in DEDUCTIBLE
        ]
    ).T
    total_costs = yearly_premium + out_of_pocket_costs

    optimal_deductible_indices = np.argmin(total_costs, axis=1)
    transitions = []
    current_optimal = optimal_deductible_indices[0]

    for i in range(1, len(optimal_deductible_indices)):
        if optimal_deductible_indices[i] != current_optimal:
            from_idx = current_optimal
            to_idx = optimal_deductible_indices[i]
            cost_from = total_costs[:, from_idx]
            cost_to = total_costs[:, to_idx]
            diff = cost_from - cost_to
            sign_changes = np.where(np.diff(np.sign(diff)))[0]
            if len(sign_changes) > 0:
                cross_idx = sign_changes[0]
                if cross_idx < len(diff) - 1:
                    prev_diff = diff[cross_idx]
                    next_diff = diff[cross_idx + 1]
                    fraction = (
                        prev_diff / (prev_diff - next_diff)
                        if prev_diff != next_diff
                        else 0
                    )
                    precise_health_cost = yearly_costs[cross_idx] + fraction * (
                        yearly_costs[cross_idx + 1] - yearly_costs[cross_idx]
                    )
                else:
                    precise_health_cost = yearly_costs[cross_idx]
                transitions.append((precise_health_cost, from_idx, to_idx))
            current_optimal = optimal_deductible_indices[i]

    return transitions


def check_for_dominant_deductible(premiums):
    """Check if one deductible is optimal across the entire range."""
    yearly_premium = np.array(premiums) * 12
    yearly_costs = np.arange(0, 10001, 1)

    out_of_pocket_costs = np.array(
        [
            np.minimum(yearly_costs, ded)
            + np.where(
                yearly_costs > ded,
                np.minimum(0.1 * (yearly_costs - ded), CO_INSURANCE),
                0,
            )
            for ded in DEDUCTIBLE
        ]
    ).T
    total_costs = yearly_premium + out_of_pocket_costs

    optimal_deductible_indices = np.argmin(total_costs, axis=1)
    unique, counts = np.unique(optimal_deductible_indices, return_counts=True)
    max_count_idx = np.argmax(counts)
    dominant_deductible_idx = unique[max_count_idx]
    dominance_percentage = counts[max_count_idx] / len(optimal_deductible_indices)

    # True dominance requires 100% coverage across all health costs
    is_dominant = dominance_percentage == 1.0

    return (
        is_dominant,
        dominant_deductible_idx if is_dominant else None,
        dominance_percentage,
    )


def find_most_significant_breakeven(premiums):
    """Find the most significant break-even point between key transitions."""
    is_dominant, dominant_idx, _ = check_for_dominant_deductible(premiums)
    if is_dominant:
        return None

    yearly_premium = np.array(premiums) * 12
    yearly_costs = np.arange(0, 10001, 1)

    out_of_pocket_costs = np.array(
        [
            np.minimum(yearly_costs, ded)
            + np.where(
                yearly_costs > ded,
                np.minimum(0.1 * (yearly_costs - ded), CO_INSURANCE),
                0,
            )
            for ded in DEDUCTIBLE
        ]
    ).T
    total_costs = yearly_premium + out_of_pocket_costs

    transitions = find_optimal_transitions(premiums)
    if not transitions:
        return None

    # Prioritize the break-even between CHF 500 and CHF 2500 if it exists
    for health_cost, from_idx, to_idx in transitions:
        if (DEDUCTIBLE[from_idx] == 300 and DEDUCTIBLE[to_idx] == 2500) or (
            DEDUCTIBLE[from_idx] == 2500 and DEDUCTIBLE[to_idx] == 300
        ):
            return health_cost, from_idx, to_idx

    # Fallback: Return the first significant transition
    return transitions[0] if transitions else None


def compute_break_even(premiums):
    """Compute the most significant break-even point dynamically."""
    is_dominant, dominant_idx, _ = check_for_dominant_deductible(premiums)
    if is_dominant:
        return [
            f"No break-even point - CHF {DEDUCTIBLE[dominant_idx]} deductible is optimal across all health cost levels",
            "",
            "",
        ]

    transition = find_most_significant_breakeven(premiums)
    if transition is None:
        return ["No significant break-even point found", "", ""]

    health_cost, from_idx, to_idx = transition
    return [
        f"{health_cost:.0f}",
        f"{DEDUCTIBLE[from_idx]}",
        f"{DEDUCTIBLE[to_idx]}",
    ]


def generate_plot(premiums, lang="en"):
    """Generate a plot of total insurance costs by deductible with language support."""
    yearly_premium = np.array(premiums) * 12
    yearly_costs = np.arange(0, 10001, 1)
    out_of_pocket_costs = np.array(
        [
            np.minimum(yearly_costs, ded)
            + np.where(
                yearly_costs > ded,
                np.minimum(0.1 * (yearly_costs - ded), CO_INSURANCE),
                0,
            )
            for ded in DEDUCTIBLE
        ]
    ).T
    total_costs = yearly_premium + out_of_pocket_costs

    is_dominant, dominant_idx, _ = check_for_dominant_deductible(premiums)
    transition = find_most_significant_breakeven(premiums) if not is_dominant else None

    fig, ax = plt.subplots(figsize=(12, 6))
    colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"]
    lines = []

    translations = TRANSLATIONS.get(lang, TRANSLATIONS["en"])  # Fallback to English

    for i, ded in enumerate(DEDUCTIBLE):
        linewidth = 3 if is_dominant and i == dominant_idx else 2
        alpha = 1.0 if not is_dominant or i == dominant_idx else 0.7
        (line,) = ax.plot(
            yearly_costs,
            total_costs[:, i],
            label=f"{ded} CHF {'*' if is_dominant and i == dominant_idx else ''}",
            color=colors[i],
            linewidth=linewidth,
            alpha=alpha,
        )
        lines.append(line)

    if transition is not None and not is_dominant:
        break_even_cost, from_idx, to_idx = transition
        vline = ax.axvline(
            break_even_cost,
            color="gray",
            linestyle=":",
            label=translations["break_even_label"].format(cost=break_even_cost),
            alpha=0.7,
            linewidth=2,
        )
        lines.append(vline)
        ax.annotate(
            translations["optimal_text"].format(deductible=DEDUCTIBLE[from_idx]),
            xy=(
                break_even_cost * 0.7,
                total_costs[int(break_even_cost * 0.7), from_idx],
            ),
            xytext=(
                break_even_cost * 1.1,
                total_costs[int(break_even_cost * 0.7), from_idx] - 400,
            ),
            arrowprops=dict(arrowstyle="->", color="gray", alpha=0.7),
            fontsize=10,
            ha="center",
        )
        ax.annotate(
            translations["optimal_text"].format(deductible=DEDUCTIBLE[to_idx]),
            xy=(break_even_cost * 1.3, total_costs[int(break_even_cost * 1.3), to_idx]),
            xytext=(
                break_even_cost * 1.7,
                total_costs[int(break_even_cost * 1.3), to_idx] - 400,
            ),
            arrowprops=dict(arrowstyle="->", color="gray", alpha=0.7),
            fontsize=10,
            ha="center",
        )

    if is_dominant:
        ax.text(
            0.02,
            0.98,
            translations["dominant_text"].format(deductible=DEDUCTIBLE[dominant_idx]),
            transform=ax.transAxes,
            verticalalignment="top",
            bbox=dict(boxstyle="round,pad=0.3", facecolor="lightblue", alpha=0.8),
            fontsize=11,
            fontweight="bold",
        )

    ax.set_xlabel(translations["xlabel"], fontsize=12)
    ax.set_ylabel(translations["ylabel"], fontsize=12)
    ax.set_title(translations["title"], fontsize=14, pad=15)
    ax.grid(True, linestyle="--", alpha=0.7)
    legend_title = (
        translations["legend_title_no_dominant"]
        if not is_dominant
        else translations["legend_title_dominant"]
    )
    ax.legend(handles=lines, title=legend_title, loc="lower right", fontsize=10)

    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=300, bbox_inches="tight")
    plt.close()
    buf.seek(0)
    return buf


def get_all_transitions_info(premiums):
    """Get detailed information about all transition points."""
    transitions = find_optimal_transitions(premiums)
    info = [
        {
            "health_cost": health_cost,
            "from_deductible": DEDUCTIBLE[from_idx],
            "to_deductible": DEDUCTIBLE[to_idx],
            "from_deductible_idx": from_idx,
            "to_deductible_idx": to_idx,
        }
        for health_cost, from_idx, to_idx in transitions
    ]
    return info


def debug_optimal_choices(premiums, max_cost=5000):
    """Debug function to see which deductible is optimal at different health cost levels."""
    yearly_premium = np.array(premiums) * 12
    yearly_costs = np.arange(0, max_cost + 1, 100)

    out_of_pocket_costs = np.array(
        [
            np.minimum(yearly_costs, ded)
            + np.where(
                yearly_costs > ded,
                np.minimum(0.1 * (yearly_costs - ded), CO_INSURANCE),
                0,
            )
            for ded in DEDUCTIBLE
        ]
    ).T
    total_costs = yearly_premium + out_of_pocket_costs

    print("Health Cost | Optimal Deductible | All Costs")
    print("-" * 50)
    for i, health_cost in enumerate(yearly_costs):
        costs = total_costs[i]
        optimal_idx = np.argmin(costs)
        optimal_deductible = DEDUCTIBLE[optimal_idx]
        costs_str = " | ".join([f"{cost:.0f}" for cost in costs])
        print(f"{health_cost:10d} | {optimal_deductible:15d} | {costs_str}")

    return total_costs
