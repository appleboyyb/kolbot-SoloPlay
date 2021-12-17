//	/d2bs/kolbot/libs/config/Builds/Paladin.Classicauradin.js

js_strict(true);

if (!isIncluded("SoloPlay/Functions/Globals.js")) { include("SoloPlay/Functions/Globals.js"); }
SetUp.include();

let AutoBuildTemplate = {

	1:	{
		Update: function () {
			Config.Vigor = false;
			Config.AttackSkill = [-1, sdk.skills.Zeal, sdk.skills.HolyShock, sdk.skills.Zeal, sdk.skills.Shock, sdk.skills.Zeal, sdk.skills.HolyFreeze];
			Config.LowManaSkill = [-1, -1];
			Config.SkipImmune = ["lightning and cold and physical"];	// Don't think this ever happens but should skip if it does

			Config.BeltColumn = ["hp", "hp", "mp", "rv"];
			Config.MinColumn[0] = Config.BeltColumn[0] !== "rv" ? Math.max(1, Storage.BeltSize() - 1) : 0;
			Config.MinColumn[1] = Config.BeltColumn[1] !== "rv" ? Math.max(1, Storage.BeltSize() - 1) : 0;
			Config.MinColumn[2] = Config.BeltColumn[2] !== "rv" ? Math.max(1, Storage.BeltSize() - 1) : 0;
			Config.MinColumn[3] = Config.BeltColumn[3] !== "rv" ? Math.max(1, Storage.BeltSize() - 1) : 0;
		}
	},
};
