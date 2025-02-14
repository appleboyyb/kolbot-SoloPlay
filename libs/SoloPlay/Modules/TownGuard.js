(function (module, require, thread) {
	const Messaging = require("../../modules/Messaging");
	const Worker = require("../../modules/Worker");
	const sdk = require("../../modules/sdk");

	switch (thread) {
	case "thread": {
		Worker.runInBackground.stackTrace = (new function () {
			let self = this;
			let stack;

			let myStack = "";

			// recv stack
			Messaging.on("TownGuard", (data => typeof data === "object" && data && data.hasOwnProperty("stack") && (myStack = data.stack)));

			/**
			* @constructor
			* @param {function():string} callback
			*/
			function UpdateableText(callback) {
				let element = new Text(callback(), self.x + 15, self.y + (7 * self.hooks.length), 0, 12, 0);
				self.hooks.push(element);
				this.update = () => {
					element.text = callback();
					element.visible = element.visible = [sdk.uiflags.Inventory,
						sdk.uiflags.SkillWindow,
						sdk.uiflags.TradePrompt,
						sdk.uiflags.Stash,
						sdk.uiflags.Cube,
						sdk.uiflags.QuickSkill].every(f => !getUIFlag(f));
				};
			}

			this.hooks = [];
			this.x = 150;
			this.y = 600 - (400 + (self.hooks.length * 15));
			// this.box = new Box(this.x-2, this.y-20, 250, (self.hooks.length * 15), 0, 0.2);


			for (let i = 0; i < 20; i++) {
				(i => this.hooks.push(new UpdateableText(() => stack && stack.length > i && stack[i] || "")))(i);
			}

			this.update = () => {
				stack = myStack.match(/[^\r\n]+/g);
				stack = stack && stack.slice(6/*skip path to here*/).map(el => {
					let line = el.substr(el.lastIndexOf(":") + 1);
					let functionName = el.substr(0, el.indexOf("@"));
					let filename = el.substr(el.lastIndexOf("\\") + 1);

					filename = filename.substr(0, filename.indexOf("."));

					return filename + "ÿc::ÿc0" + line + "ÿc:@ÿc0" + functionName;
				}).reverse();
				this.hooks.filter(hook => hook.hasOwnProperty("update") && typeof hook.update === "function" && hook.update());
				return true;
			};

		}).update;

		Worker.runInBackground.ping = (new function () {
			// recv heartbeat
			Messaging.on("TownGuard", (data => typeof data === "object" && data && data.hasOwnProperty("heartbeat")));

			this.update = function () {
				// Only deal with this shit if default is paused - townchicken
				const script = getScript("default.dbj");
				if (script && script.running) {
					return true;
				}
				return true;
			};
		}).update;

		let quiting = false;
		addEventListener("scriptmsg", data => data === "quit" && (quiting = true));

		while (!quiting) delay(1000);
		break;
	}
	case "started": {
		let sendStack = getTickCount();
		Worker.push(function highPrio() {
			Worker.push(highPrio);
			if ((getTickCount() - sendStack) < 200 || (sendStack = getTickCount()) && false) return true;
			Messaging.send({TownGuard: {stack: (new Error).stack}});
			return true;
		});

		let timer = getTickCount();
		Worker.runInBackground.heartbeatForTownGuard = function () {
			if ((getTickCount() - timer) < 1000 || (timer = getTickCount()) && false) return true;

			// Every second or so, we send a heartbeat tick
			Messaging.send({TownGuard: {heartbeat: getTickCount()}});

			return true;
		};
		break;
	}
	case "loaded": {
		break;
	}
	}

}).call(null, typeof module === "object" && module || {}, typeof require === "undefined" && (include("require.js") && require) || require, getScript.startAsThread());
