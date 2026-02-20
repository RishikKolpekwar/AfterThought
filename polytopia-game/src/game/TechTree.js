import { TECHS } from '../core/constants.js';

export class TechTree {
  computeCost(player, techKey) {
    const tech = TECHS[techKey];
    if (!tech) return Infinity;
    const numCities = Math.max(1, player.cities.length);
    let cost = (tech.tier * numCities) + 4;
    // Literacy: philosophy gives 33% discount on future techs
    if (player.technologies.includes('philosophy') && techKey !== 'philosophy') {
      cost = Math.ceil(cost * 0.67);
    }
    return cost;
  }

  canResearch(player, techKey) {
    const tech = TECHS[techKey];
    if (!tech) return false;
    if (player.technologies.includes(techKey)) return false;
    const cost = this.computeCost(player, techKey);
    if (player.stars < cost) return false;
    if (tech.requires && !player.technologies.includes(tech.requires)) return false;
    return true;
  }

  research(player, techKey) {
    if (!this.canResearch(player, techKey)) return false;
    const cost = this.computeCost(player, techKey);
    player.stars -= cost;
    player.technologies.push(techKey);
    return true;
  }

  getAvailableTechs(player) {
    const available = [];
    for (const [key, tech] of Object.entries(TECHS)) {
      if (player.technologies.includes(key)) continue;
      if (tech.requires && !player.technologies.includes(tech.requires)) continue;
      const cost = this.computeCost(player, key);
      available.push({ key, ...tech, cost, canAfford: player.stars >= cost });
    }
    return available;
  }

  hasTech(player, techKey) {
    return player.technologies.includes(techKey);
  }
}
