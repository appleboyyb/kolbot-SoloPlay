/**
*  @filename    PickitOverrides.js
*  @author      theBGuy
*  @credit      sonic, jaenster
*  @desc        Picking related functions
*
*/

includeIfNotIncluded("common/Pickit.js");
includeIfNotIncluded("SoloPlay/Functions/PrototypeOverrides.js");
includeIfNotIncluded("SoloPlay/Functions/NTIPOverrides.js");
includeIfNotIncluded("SoloPlay/Functions/MiscOverrides.js");

Pickit.enabled = true;
Pickit.Result.SOLOWANTS = 8;
Pickit.Result.SOLOSYSTEM = 9;

Pickit.minItemKeepGoldValue = function () {
	const myGold = me.gold;
	const cLvl = me.charlvl;
	switch (true) {
	case myGold < Math.min(Math.floor(500 + (cLvl * 100 * Math.sqrt(cLvl - 1))), 250000):
		return 10;
	case myGold < Math.min(Math.floor(500 + (cLvl * 250 * Math.sqrt(cLvl - 1))), 250000):
		return 50;
	case myGold < Math.min(Math.floor(500 + (cLvl * 500 * Math.sqrt(cLvl - 1))), 250000):
		return 500;
	default:
		return 1000;
	}
};

Pickit.checkItem = function (unit) {
	const rval = NTIP.CheckItem(unit, false, true);
	const resultObj = (result, line = null) => ({
		result: result,
		line: line
	});

	// quick return on essentials - we know they aren't going to be in the other checks
	if (Pickit.essentials.includes(unit.itemType)) return rval;

	if ((unit.classid === sdk.items.runes.Ral || unit.classid === sdk.items.runes.Ort) && Town.repairIngredientCheck(unit)) {
		return resultObj(Pickit.Result.UTILITY);
	}

	if (CharData.skillData.bowData.bowOnSwitch) {
		if ([sdk.items.type.Bow, sdk.items.type.AmazonBow].includes(CharData.skillData.bowData.bowType) && unit.itemType === sdk.items.type.BowQuiver && Item.getQuantityOwned(unit, true) < 1) {
			return resultObj(Pickit.Result.SOLOWANTS, "Switch-Arrows");
		} else if (CharData.skillData.bowData.bowType === sdk.items.type.Crossbow && unit.itemType === sdk.items.type.CrossbowQuiver && Item.getQuantityOwned(unit, true) < 1) {
			return resultObj(Pickit.Result.SOLOWANTS, "Switch-Bolts");
		}
	}

	if (unit.classid === sdk.items.StaminaPotion && (me.charlvl < 18 || me.staminaPercent <= 85 || me.walking) && Item.getQuantityOwned(unit, true) < 2) {
		return resultObj(Pickit.Result.WANTED, "LowStamina");
	}

	if (unit.classid === sdk.items.AntidotePotion && me.getState(sdk.states.Poison) && Item.getQuantityOwned(unit, true) < 2) {
		return resultObj(Pickit.Result.WANTED, "Poisoned");
	}

	if (unit.classid === sdk.items.ThawingPotion && [sdk.states.Frozen, sdk.states.FrozenSolid].some(state => me.getState(state)) && Item.getQuantityOwned(unit, true) < 2) {
		return resultObj(Pickit.Result.WANTED, "Frozen");
	}

	if (rval.result === Pickit.Result.WANTED) {
		let durability = unit.getStat(sdk.stats.Durability);
		
		if (typeof durability === "number" && unit.getStat(sdk.stats.MaxDurability) > 0 && durability * 100 / unit.getStat(sdk.stats.MaxDurability) <= 0) {
			return resultObj(Pickit.Result.TRASH);
		}
	}

	if (SoloWants.checkItem(unit)) return resultObj(Pickit.Result.SOLOSYSTEM);
	if (CraftingSystem.checkItem(unit)) return resultObj(Pickit.Result.CRAFTING);
	if (Cubing.checkItem(unit)) return resultObj(Pickit.Result.CUBING);
	if (Runewords.checkItem(unit)) return resultObj(Pickit.Result.RUNEWORD);
	if (AutoEquip.hasTier(unit) && !unit.identified) return resultObj(Pickit.Result.UNID);

	if (unit.isCharm/*  && NTIP.GetCharmTier(unit) > 0 && unit.identified */) {
		if (Item.autoEquipCharmCheck(unit)) {
			return resultObj(Pickit.Result.SOLOWANTS, "Autoequip charm Tier: " + NTIP.GetCharmTier(unit));
		}

		return NTIP.CheckItem(unit, NTIP_CheckListNoTier, true);
	}

	if ((NTIP.GetMercTier(unit) > 0 || NTIP.GetTier(unit) > 0 || NTIP.GetSecondaryTier(unit) > 0) && unit.identified) {
		if (Item.autoEquipCheck(unit)) {
			return resultObj(Pickit.Result.SOLOWANTS, "Autoequip Tier: " + NTIP.GetTier(unit));
		}

		if (Item.autoEquipCheckMerc(unit)) {
			return resultObj(Pickit.Result.SOLOWANTS, "Autoequip MercTier: " + NTIP.GetMercTier(unit));
		}

		if (Item.autoEquipCheckSecondary(unit)) {
			return resultObj(Pickit.Result.SOLOWANTS, "Autoequip Secondary Tier: " + NTIP.GetSecondaryTier(unit));
		}

		return NTIP.CheckItem(unit, NTIP_CheckListNoTier, true);
	}

	if (rval.result === Pickit.Result.WANTED && unit.isBaseType) {
		if (NTIP.CheckItem(unit, NTIP.SoloCheckListNoTier)) {
			return resultObj(Pickit.Result.SOLOWANTS, "Base Type Item");
		}
	}

	// LowGold
	if (rval.result === Pickit.Result.UNWANTED && !Town.ignoredItemTypes.includes(unit.itemType) && !unit.questItem
		&& (unit.isInInventory || (me.gold < Config.LowGold || me.gold < 500000))) {
		// Gold doesn't take up room, just pick it up
		if (unit.classid === sdk.items.Gold) return resultObj(Pickit.Result.TRASH);

		const itemValue = unit.getItemCost(sdk.items.cost.ToSell);
		const itemValuePerSquare = itemValue / (unit.sizex * unit.sizey);

		if (itemValuePerSquare >= 2000) {
			// If total gold is less than 500k pick up anything worth 2k gold per square to sell in town.
			return resultObj(Pickit.Result.TRASH, "Valuable Item: " + itemValue);
		} else if (itemValuePerSquare >= Pickit.minItemKeepGoldValue() && (me.gold < Config.LowGold || unit.isInInventory)) {
			// If total gold is less than LowGold setting pick up anything worth 10 gold per square to sell in town.
			return resultObj(Pickit.Result.TRASH, "LowGold Item: " + itemValue);
		}
	}

	return rval;
};

// @jaenster
Pickit.amountOfPotsNeeded = function () {
	let _a, _b, _c, _d;
	let potTypes = [sdk.items.type.HealingPotion, sdk.items.type.ManaPotion, sdk.items.type.RejuvPotion];
	let hpMax = (Array.isArray(Config.HPBuffer) ? Config.HPBuffer[1] : Config.HPBuffer);
	let mpMax = (Array.isArray(Config.MPBuffer) ? Config.MPBuffer[1] : Config.MPBuffer);
	let rvMax = (Array.isArray(Config.RejuvBuffer) ? Config.RejuvBuffer[1] : Config.RejuvBuffer);
	let needed = (_a = {},
	_a[sdk.items.type.HealingPotion] = (_b = {},
	_b[sdk.storage.Belt] = 0,
	_b[sdk.storage.Inventory] = hpMax,
	_b),
	_a[sdk.items.type.ManaPotion] = (_c = {},
	_c[sdk.storage.Belt] = 0,
	_c[sdk.storage.Inventory] = mpMax,
	_c),
	_a[sdk.items.type.RejuvPotion] = (_d = {},
	_d[sdk.storage.Belt] = 0,
	_d[sdk.storage.Inventory] = rvMax,
	_d),
	_a);
	if (hpMax > 0 || mpMax > 0 || rvMax > 0) {
		me.getItemsEx()
			.filter((pot) => potTypes.includes(pot.itemType) && (pot.isInBelt || pot.isInInventory))
			.forEach(function (pot) {
				needed[pot.itemType][pot.location] -= 1;
			});
	}
	let missing = Town.checkColumns(Pickit.beltSize);
	Config.BeltColumn.forEach(function (column, index) {
		if (column === "hp") {needed[sdk.items.type.HealingPotion][sdk.storage.Belt] = missing[index];}
		if (column === "mp") {needed[sdk.items.type.ManaPotion][sdk.storage.Belt] = missing[index];}
		if (column === "rv") {needed[sdk.items.type.RejuvPotion][sdk.storage.Belt] = missing[index];}
	});
	return needed;
};

Pickit.canFit = function (item) {
	switch (item.itemType) {
	case sdk.items.type.Gold:
		return true;
	case sdk.items.type.Scroll:
	{
		let tome = me.findItem(item.classid - 11, 0, sdk.storage.Inventory);
		return (tome && tome.getStat(sdk.stats.Quantity) < 20) || Storage.Inventory.CanFit(item);
	}
	case sdk.items.type.HealingPotion:
	case sdk.items.type.ManaPotion:
	case sdk.items.type.RejuvPotion:
		{
			let pots = this.amountOfPotsNeeded();
			if (pots[item.itemType][sdk.storage.Belt] > 0) {
				// this potion can go in belt
				return true;
			}
		}
		return Storage.Inventory.CanFit(item);
	default:
		return Storage.Inventory.CanFit(item);
	}
};

Pickit.canPick = function (unit) {
	if (!unit) return false;
	if (sdk.quest.items.includes(unit.classid) && me.getItem(unit.classid)) return false;
	
	// TODO: clean this up

	let tome, charm, i, potion, needPots, buffers, pottype, myKey, key;

	switch (unit.itemType) {
	case sdk.items.type.Gold:
		// Check current gold vs max capacity (cLvl*10000) and skip if full
		return (me.getStat(sdk.stats.Gold) < me.getStat(sdk.stats.Level) * 10000);
	case sdk.items.type.Scroll:
		// 518 - Tome of Town Portal or 519 - Tome of Identify, mode 0 - inventory/stash
		tome = me.getItem(unit.classid - 11, sdk.items.mode.inStorage);

		if (tome) {
			do {
				if (tome.isInInventory && tome.getStat(sdk.stats.Quantity) === 20) {
					return false; // Skip a scroll if its tome is full
				}
			} while (tome.getNext());
		} else {
			// If we don't have a tome, go ahead and keep 2 scrolls
			return unit.classid === sdk.items.ScrollofIdentify && me.charlvl > 5 ? false : me.getItemsEx(unit.classid).filter(el => el.isInInventory).length < 2;
		}

		break;
	case sdk.items.type.Key:
		// Assassins don't ever need keys
		if (me.assassin) return false;

		myKey = me.getItem(sdk.items.Key, sdk.items.mode.inStorage);
		key = Game.getItem(-1, -1, unit.gid); // Passed argument isn't an actual unit, we need to get it

		if (myKey && key) {
			do {
				if (myKey.isInInventory && myKey.getStat(sdk.stats.Quantity) + key.getStat(sdk.stats.Quantity) > 12) {
					return false;
				}
			} while (myKey.getNext());
		}

		break;
	case sdk.items.type.SmallCharm:
	case sdk.items.type.LargeCharm:
	case sdk.items.type.GrandCharm:
		if (unit.unique) {
			charm = me.getItem(unit.classid, sdk.items.mode.inStorage);

			if (charm) {
				do {
					// Skip Gheed's Fortune, Hellfire Torch or Annihilus if we already have one
					if (charm.unique) return false;
				} while (charm.getNext());
			}
		}

		break;
	case sdk.items.type.HealingPotion:
	case sdk.items.type.ManaPotion:
	case sdk.items.type.RejuvPotion:
		needPots = 0;

		for (i = 0; i < 4; i += 1) {
			if (typeof unit.code === "string" && unit.code.includes(Config.BeltColumn[i])) {
				needPots += this.beltSize;
			}
		}

		potion = me.getItem(-1, sdk.items.mode.inBelt);

		if (potion) {
			do {
				if (potion.itemType === unit.itemType) {
					needPots -= 1;
				}
			} while (potion.getNext());
		}

		// re-do this to pick items to cursor if we don't want them in our belt then place them in invo
		let beltCheck = this.checkBelt();
		if (needPots < 1) {
			buffers = ["HPBuffer", "MPBuffer", "RejuvBuffer"];

			for (i = 0; i < buffers.length; i += 1) {
				if (Config[buffers[i]]) {
					pottype = (() => {
						switch (buffers[i]) {
						case "HPBuffer":
							return sdk.items.type.HealingPotion;
						case "MPBuffer":
							return sdk.items.type.ManaPotion;
						case "RejuvBuffer":
							return sdk.items.type.RejuvPotion;
						default:
							return -1;
						}
					})();

					if (unit.itemType === pottype) {
						if (!Storage.Inventory.CanFit(unit)) return false;

						needPots = Config[buffers[i]];
						potion = me.getItem(-1, sdk.items.mode.inStorage);

						if (potion) {
							do {
								if (potion.itemType === pottype && potion.isInInventory) {
									needPots -= 1;
								}
							} while (potion.getNext());
						}
					}

					needPots > 0 && !beltCheck && Pickit.toCursorPick.push(unit.gid);
				}
			}
		}

		if (needPots < 1) {
			potion = me.getItem();

			if (potion) {
				do {
					if (potion.itemType === unit.itemType && (potion.isInInventory || potion.isInBelt)) {
						if (potion.classid < unit.classid) {
							potion.use();
							needPots += 1;

							break;
						}
					}
				} while (potion.getNext());
			}
		}

		return (needPots > 0);
	case undefined: // Yes, it does happen
		console.warn("undefined item (!?)");

		return false;
	}

	return true;
};

Pickit.toCursorPick = [];

Pickit.pickItem = function (unit, status, keptLine, clearBeforePick = true) {
	function ItemStats (unit) {
		let self = this;
		self.x = unit.x;
		self.y = unit.y;
		self.ilvl = unit.ilvl;
		self.sockets = unit.sockets;
		self.type = unit.itemType;
		self.classid = unit.classid;
		self.name = unit.name;
		self.color = Pickit.itemColor(unit);
		self.gold = unit.getStat(sdk.stats.Gold);
		self.dist = (unit.distance || Infinity);
		let canTk = (Skill.haveTK && Pickit.tkable.includes(self.type) && Pickit.toCursorPick.indexOf(unit.gid) === -1
			&& self.dist > 5 && self.dist < 20 && !checkCollision(me, unit, sdk.collision.WallOrRanged));
		self.useTk = canTk && (me.mpPercent > 50);
		self.picked = false;
	}

	let item, tick, gid, retry = false;
	const itemCount = me.itemcount;
	const cancelFlags = [sdk.uiflags.Inventory, sdk.uiflags.NPCMenu, sdk.uiflags.Waypoint, sdk.uiflags.Shop, sdk.uiflags.Stash, sdk.uiflags.Cube];

	if (!unit || unit === undefined) return false;

	if (unit.gid) {
		gid = unit.gid;
		item = Game.getItem(-1, -1, gid);
	}

	if (!item) return false;

	for (let i = 0; i < cancelFlags.length; i += 1) {
		if (getUIFlag(cancelFlags[i])) {
			delay(500);
			me.cancel(0);

			break;
		}
	}

	const stats = new ItemStats(item);
	const tkMana = stats.useTk ? Skill.getManaCost(sdk.skills.Telekinesis) * 2 : Infinity;

	MainLoop:
	for (let i = 0; i < 3; i += 1) {
		if (me.dead) return false;
		if (!Game.getItem(-1, -1, gid)) {
			break;
		}

		while (!me.idle) {
			delay(40);
		}

		if (!item.onGroundOrDropping) {
			break;
		}

		let itemDist = item.distance;
		// todo - allow picking near potions/scrolls while attacking distance < 5
		if (stats.useTk && me.mp > tkMana) {
			Packet.telekinesis(item);
		} else {
			let checkItem = false;
			const maxDist = (Config.FastPick || i < 1) ? 8 : 5;
			if (item.distance > maxDist || checkCollision(me, item, sdk.collision.BlockWall)) {
				if (!clearBeforePick && me.checkForMobs({range: 5, coll: (sdk.collision.BlockWall | sdk.collision.Objects | sdk.collision.ClosedDoor)})) {
					continue;
				}

				if (clearBeforePick && item.checkForMobs({range: 8, coll: (sdk.collision.BlockWall | sdk.collision.Objects | sdk.collision.ClosedDoor)})) {
					try {
						console.log("ÿc8PickItemÿc0 :: Clearing area around item I want to pick");
						Pickit.enabled = false;		// Don't pick while trying to clear
						Attack.clearPos(item.x, item.y, 10, false);
					} finally {
						Pickit.enabled = true;		// Reset value
					}
				}
				checkItem = true;
			}

			if (checkItem || i > 0) {
				if (copyUnit(item).x === undefined || !item.onGroundOrDropping) {
					break;
				}
				if (!Pather.moveNearUnit({ x: stats.x, y: stats.y }, 5)) continue;
			}

			let cursorUnit;
			itemDist = item.distance;
			// use packet first, if we fail and not using fast pick use click
			Pickit.toCursorPick.includes(item.gid)
				? Packet.click(item, true) && (cursorUnit = Misc.poll(() => Game.getCursorUnit(), (itemDist > 10 ? 1000 : 250), 50)) && Storage.Inventory.MoveTo(cursorUnit)
				: (Config.FastPick || i < 1) ? Packet.click(item) : Misc.click(0, 0, item);
		}

		tick = getTickCount();

		while (getTickCount() - tick < (itemDist > 10 ? 2000 : 1000)) {
			item = copyUnit(item);
			Pickit.toCursorPick.includes(item.gid) && Pickit.toCursorPick.remove(item.gid);

			if (stats.classid === sdk.items.Gold) {
				if (!item.getStat(sdk.stats.Gold) || item.getStat(sdk.stats.Gold) < stats.gold) {
					console.log("ÿc7Picked up " + stats.color + (item.getStat(sdk.stats.Gold) ? (item.getStat(sdk.stats.Gold) - stats.gold) : stats.gold) + " " + stats.name);

					return true;
				}
			}

			if (!item.onGroundOrDropping) {
				switch (stats.classid) {
				case sdk.items.Key:
					console.log("ÿc7Picked up " + stats.color + stats.name + " ÿc7(" + Town.checkKeys() + "/12)");

					return true;
				case sdk.items.ScrollofTownPortal:
				case sdk.items.ScrollofIdentify:
					console.log("ÿc7Picked up " + stats.color + stats.name + " ÿc7(" + Town.checkScrolls(stats.classid === sdk.items.ScrollofTownPortal ? "tbk" : "ibk") + "/20)");

					return true;
				case sdk.items.Arrows:
				case sdk.items.Bolts:
					me.needRepair();
					
					break;
				}

				me.itemoncursor && Storage.Inventory.MoveTo(Game.getCursorUnit());

				break MainLoop;
			}

			delay(20);
		}

		// TK failed, disable it
		stats.useTk = false;

		//console.log("pick retry");
	}

	if (retry) return this.pickItem(unit, status, keptLine);

	stats.picked = me.itemcount > itemCount || !!me.getItem(-1, -1, gid);

	if (stats.picked) {
		DataFile.updateStats("lastArea");

		switch (status) {
		case Pickit.Result.WANTED:
		case Pickit.Result.SOLOWANTS:
			console.log("ÿc7Picked up " + stats.color + stats.name + " ÿc0(ilvl " + stats.ilvl + (stats.sockets > 0 ? ") (sockets " + stats.sockets : "") + (keptLine ? ") (" + keptLine + ")" : ")"));

			if (this.ignoreLog.indexOf(stats.type) === -1) {
				Misc.itemLogger("Kept", item);
				Misc.logItem("Kept", item, keptLine);
			}

			if (item.identified && item.isInInventory && AutoEquip.wanted(item)) {
				((Item.autoEquipCheck(item) && Item.autoEquip("Field")) || (Item.autoEquipCheckSecondary(item) && Item.autoEquipSecondary("Field")));
			}

			break;
		case Pickit.Result.CUBING:
			console.log("ÿc7Picked up " + stats.color + stats.name + " ÿc0(ilvl " + stats.ilvl + ")" + " (Cubing)");
			Misc.itemLogger("Kept", item, "Cubing " + me.findItems(item.classid).length);
			Cubing.update();

			break;
		case Pickit.Result.RUNEWORD:
			console.log("ÿc7Picked up " + stats.color + stats.name + " ÿc0(ilvl " + stats.ilvl + ")" + " (Runewords)");
			Misc.itemLogger("Kept", item, "Runewords");
			Runewords.update(stats.classid, gid);

			break;
		case Pickit.Result.CRAFTING:
			console.log("ÿc7Picked up " + stats.color + stats.name + " ÿc0(ilvl " + stats.ilvl + ")" + " (Crafting System)");
			CraftingSystem.update(item);

			break;
		case Pickit.Result.SOLOSYSTEM:
			console.log("ÿc7Picked up " + stats.color + stats.name + " ÿc0(ilvl " + stats.ilvl + ")" + " (SoloWants System)");
			SoloWants.update(item);

			break;
		default:
			console.log("ÿc7Picked up " + stats.color + stats.name + " ÿc0(ilvl " + stats.ilvl + (keptLine ? ") (" + keptLine + ")" : ")"));

			break;
		}
	}

	return true;
};

Pickit.checkSpotForItems = function (spot, checkVsMyDist = false, range = Config.PickRange) {
	if (spot.x === undefined) return false;
	let itemList = [];
	let item = Game.getItem();

	if (item) {
		do {
			if (item.onGroundOrDropping && getDistance(spot, item) <= range) {
				const spotDist = getDistance(spot, item);
				const itemDistFromMe = item.distance;
				if (Pickit.essentials.includes(item.itemType)) {
					if (Pickit.checkItem(item).result && Pickit.canPick(item) && Pickit.canFit(item)) {
						checkVsMyDist && itemDistFromMe < spotDist ? Pickit.essentials.push(copyUnit(item)) : itemList.push(copyUnit(item));
					}
				} else if (item.itemType === sdk.items.type.Key) {
					if (Pickit.canPick(item) && Pickit.checkItem(item).result) {
						checkVsMyDist && itemDistFromMe < spotDist ? Pickit.pickList.push(copyUnit(item)) : itemList.push(copyUnit(item));
					}
				} else if (Pickit.checkItem(item).result) {
					if (checkVsMyDist && itemDistFromMe < spotDist) {
						Pickit.pickList.push(copyUnit(item));
					} else {
						return true;
					}
				}
			}
		} while (item.getNext());
	}

	return itemList.length > 3;
};

Pickit.pickList = [];
Pickit.essentialList = [];

// Might need to do a global list so this function and pickItems see the same items to prevent an item from being in both
Pickit.essessntialsPick = function (clearBeforePick = false, ignoreGold = false, builtList = [], once = false) {
	if (me.dead || me.inTown || (!Pickit.enabled && !clearBeforePick)) return false;

	Pickit.essentialList.concat(builtList, Pickit.pickList).filter(i => !!i && Pickit.essentials.includes(i.itemType));
	let item = Game.getItem();
	const maxDist = Skill.haveTK ? 15 : 5;

	if (item) {
		do {
			if (item.onGroundOrDropping && getDistance(me, item) <= maxDist && Pickit.essentials.includes(item.itemType)) {
				if (Pickit.essentialList.some(el => el.gid === item.gid)) continue;
				if (item.itemType !== sdk.items.type.Gold || getDistance(me, item) < 5) {
					Pickit.essentialList.push(copyUnit(item));
				}
			}
		} while (item.getNext());
	}

	if (!Pickit.essentialList.length) return true;

	while (!me.idle) {
		delay(40);
	}

	while (Pickit.essentialList.length > 0) {
		if (me.dead || !Pickit.enabled) return false;

		Pickit.essentialList.sort(this.sortItems);
		const currItem = Pickit.essentialList[0];

		// Check if the item unit is still valid and if it's on ground or being dropped
		// Don't pick items behind walls/obstacles when walking
		if (copyUnit(currItem).x !== undefined && currItem.onGroundOrDropping
			&& (Pather.useTeleport() || !checkCollision(me, currItem, sdk.collision.BlockWall))) {
			// Check if the item should be picked
			let status = this.checkItem(currItem);

			if (status.result && Pickit.canPick(currItem)) {
				let canFit = (Storage.Inventory.CanFit(currItem) || Pickit.canFit(currItem));

				// Field id when our used space is above a certain percent or if we are full try to make room with FieldID
				if (Config.FieldID.Enabled && (!canFit || Storage.Inventory.UsedSpacePercent() > Config.FieldID.UsedSpace)) {
					me.fieldID() && (canFit = (currItem.gid !== undefined && Storage.Inventory.CanFit(currItem)));
				}

				// Try to make room by selling items in town
				if (!canFit) {
					// Check if any of the current inventory items can be stashed or need to be identified and eventually sold to make room
					if (this.canMakeRoom()) {
						console.log("ÿc7Trying to make room for " + this.itemColor(currItem) + currItem.name);

						// Go to town and do town chores
						if (Town.visitTown()) {
							// Recursive check after going to town. We need to remake item list because gids can change.
							// Called only if room can be made so it shouldn't error out or block anything.
							return this.essessntialsPick(clearBeforePick, ignoreGold, builtList, once);
						}

						// Town visit failed - abort
						console.log("ÿc7Not enough room for " + this.itemColor(currItem) + currItem.name);

						return false;
					}

					// Can't make room
					Misc.itemLogger("No room for", currItem);
					console.log("ÿc7Not enough room for " + this.itemColor(currItem) + currItem.name);
				}

				// Item can fit - pick it up
				if (canFit) {
					let picked = this.pickItem(currItem, status.result, status.line, clearBeforePick);
					if (picked && once) return true;
				}
			}
		}

		Pickit.essentialList.shift();
	}

	return true;
};

Pickit.pickItems = function (range = Config.PickRange, once = false) {
	if (me.dead || range < 0 || !Pickit.enabled) return false;
	
	let status, canFit;
	let needMule = false;

	while (!me.idle) {
		delay(40);
	}

	let item = Game.getItem();

	if (item) {
		do {
			if (Pickit.pickList.some(el => el.gid === item.gid)) continue;
			if (item.onGroundOrDropping && getDistance(me, item) <= range) {
				Pickit.pickList.push(copyUnit(item));
			}
		} while (item.getNext());
	}

	if (Pickit.pickList.some(i => [sdk.items.type.HealingPotion, sdk.items.type.ManaPotion, sdk.items.type.RejuvPotion].includes(i.itemType))) {
		Town.clearBelt();
		Pickit.beltSize = Storage.BeltSize();
	}

	while (Pickit.pickList.length > 0) {
		if (me.dead || !Pickit.enabled) return false;

		Pickit.pickList.sort(this.sortItems);
		const currItem = Pickit.pickList[0];

		// Check if the item unit is still valid and if it's on ground or being dropped
		// Don't pick items behind walls/obstacles when walking
		if (copyUnit(currItem).x !== undefined && currItem.onGroundOrDropping
			&& (Pather.useTeleport() || me.inTown || !checkCollision(me, currItem, sdk.collision.BlockWall))) {
			// Check if the item should be picked
			status = this.checkItem(currItem);

			if (status.result && Pickit.canPick(currItem)) {
				canFit = (Storage.Inventory.CanFit(currItem) || Pickit.canFit(currItem));

				// Field id when our used space is above a certain percent or if we are full try to make room with FieldID
				if (Config.FieldID.Enabled && (!canFit || Storage.Inventory.UsedSpacePercent() > Config.FieldID.UsedSpace)) {
					me.fieldID() && (canFit = (currItem.gid !== undefined && Storage.Inventory.CanFit(currItem)));
				}

				// Try to make room by selling items in town
				if (!canFit) {
					// Check if any of the current inventory items can be stashed or need to be identified and eventually sold to make room
					if (this.canMakeRoom()) {
						console.log("ÿc7Trying to make room for " + this.itemColor(currItem) + currItem.name);

						// Go to town and do town chores
						if (Town.visitTown()) {
							// Recursive check after going to town. We need to remake item list because gids can change.
							// Called only if room can be made so it shouldn't error out or block anything.
							return this.pickItems(range, once);
						}

						// Town visit failed - abort
						console.log("ÿc7Not enough room for " + this.itemColor(currItem) + currItem.name);

						return false;
					}

					// Can't make room - trigger automule
					Misc.itemLogger("No room for", currItem);
					console.log("ÿc7Not enough room for " + this.itemColor(currItem) + currItem.name);

					needMule = true;
				}

				// Item can fit - pick it up
				if (canFit) {
					let picked = this.pickItem(currItem, status.result, status.line);
					if (picked && once) return true;
				}
			}
		}

		Pickit.pickList.shift();
	}

	// Quit current game and transfer the items to mule
	if (needMule && AutoMule.getInfo() && AutoMule.getInfo().hasOwnProperty("muleInfo") && AutoMule.getMuleItems().length > 0) {
		scriptBroadcast("mule");
		scriptBroadcast("quit");
	}

	return true;
};
