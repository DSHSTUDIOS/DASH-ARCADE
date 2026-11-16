export const spyWords = `
Anchor Apple Arch Atlas Bank Bark Bass Bat Bay Beam Bell Bench Berry Block Board Bolt Bond Book Boot Bow Box Bridge Brush Buck Bug Button Cable Cabinet Calf Camp Cannon Canvas Cape Captain Card Case Castle Cat Cell Chain Chair Chalk Channel Charge Check Chest Chip Circle Club Coast Code Coin Crown Crane Cricket Crop Cross Deck Diamond Dice Dish Dock Draft Drill Drum Eagle Edge Engine Eye Face Fan Feather Field File Film Fire Flag Flash Fleet Floor Flute Foot Fork Fox Frame Frog Frost Gate Gear Glass Globe Glove Gong Grain Guard Gum Hammer Hand Harbor Hawk Head Heel Hill Hook Horn Horse Ice Ink Island Ivory Jack Jam Jet Jig Key King Kite Knife Knot Lamp Lap Laser Lead Leaf Lens Letter Light Line Link Lion Lock Log Loom Map Mask Mast Match Medal Meter Mill Mine Mint Mirror Model Mole Moon Mouse Nail Net Note Oak Oil Opera Orange Pad Page Palm Pan Paper Park Patch Pearl Pen Pencil Pepper Piano Pick Pig Pin Pipe Pitch Plane Plant Plate Plum Pocket Point Pole Pool Port Post Pound Press Prism Pulse Punch Quartz Queen Quill Quilt Race Radio Rail Rain Ramp Range Rat Ray Relay Ring Rifle River Road Rock Roll Root Rose Round Row Ruler Sail Salt Scale School Scoop Screen Seal Seed Shell Shield Shirt Shoe Shore Shot Shovel Silk Silver Skirt Slate Smoke Snake Snow Sock Sound Space Spike Spring Stage Stamp Star Steel Stem Stick Stone Stool Store Straw String Suit Swan Switch Table Tail Tape Tap Tank Thorn Thread Throne Thumb Ticket Tile Time Tire Toast Token Torch Tower Track Train Trap Tray Tree Triangle Trip Trumpet Trunk Tube Tunnel Turkey Valve Vault Veil Vine Violet Voice Wall Watch Wave Web Wedge Wheel Whistle Wing Wire Wood Yard Zebra Zip
`
  .trim()
  .split(/\s+/);

if (new Set(spyWords).size !== spyWords.length || spyWords.length < 200)
  throw new Error(
    "The spy word bank must contain at least 200 distinct words.",
  );
