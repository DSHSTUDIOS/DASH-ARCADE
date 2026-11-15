const cards = (source: string) =>
  source
    .trim()
    .split("\n")
    .map((line) => line.trim());

export const familyPrompts = cards(`
My dream job is getting paid to investigate ___.
The school talent show was canceled because of ___.
The prize at the bottom of the cereal box was ___.
The museum’s new hands-on exhibit is about ___.
For my next trick, I shall summon ___.
The mayor’s plan to fix traffic involves ___.
My dog’s autobiography is titled “Living with ___.”
Space camp would be way cooler with ___.
The secret ingredient in Grandma’s chili is ___.
The substitute teacher offered extra credit for ___.
The first thing the aliens asked us for was ___.
The cafeteria banned ___ after three complaints.
Things got weird at the slumber party when someone brought ___.
We replaced our school mascot with ___.
Never leave your grandparents alone with ___.
The new Olympic event everyone is talking about is ___.
I’m raising money for a documentary about ___.
For my birthday, please give me ___.
The GPS keeps directing us toward ___.
The robots were easily distracted by ___.
When life gives you lemons, trade them for ___.
Scientists found ___ under the ocean floor.
Who needs Wi-Fi when you have ___?
The new roller coaster ends with ___.
Our wedding photographer specializes in ___.
They finally solved the mystery of ___.
This year’s school play stars ___.
In three years, the world will run entirely on ___.
The hotel charged a $40 fee for ___.
My meditation app keeps suggesting ___.
The cheapest thing on the menu is ___.
A balanced breakfast starts with ___.
The wizard ran out of spells and tried ___ instead.
Welcome to the world championship of ___.
The last thing you want in your carry-on is ___.
The council has voted to replace Mondays with ___.
`);

export const familyAnswers = cards(`
a raccoon with a clipboard
an emergency cape
a tiny piano for a very large dog
a ninety-minute kazoo solo
a spreadsheet of sandwich opinions
the ghost of a retired crossing guard
twelve impatient llamas
a birthday cake made of mashed potatoes
a conspiracy about garden gnomes
a marching band stuck in an elevator
one extremely shiny potato
a podcast for insecure pigeons
a stuffed animal with a parking ticket
a dinosaur in business casual
a glitter cannon with stage fright
rehearsing a dramatic exit
a bicycle built for three squirrels
a goose with a library card
an apology written in pancake batter
the annual meeting of hat enthusiasts
an air horn full of confetti
pants that applaud when you sit down
a trombone duel at sunrise
a family-sized bowl of sprinkles
a pirate afraid of puddles
forbidden pudding
a double order of consequences
a sticker saying “probably magic”
a lemon dressed as a lime
a suspiciously damp coupon
a treehouse homeowners association
a cup of room-temperature mystery
a choir of sneezing frogs
a handwritten note from Bigfoot
a birthday clown named Kevin
a folder marked “DO NOT JUGGLE”
a turtle who majored in finance
competitive napping
wearing oven mitts to the beach
a suitcase full of inflatable elbows
a moody self-checkout robot
the world’s smallest parade float
yodeling into a walkie-talkie
a trophy for showing up late
a refrigerator full of invisible cheese
emotional support spaghetti
a personal umbrella for each toe
a very brief career as a DJ
a coupon for one high five
a fancy hat for a houseplant
a crab dressed like a traffic cone
casting spells at the DMV
a bag of commemorative air
sixteen rubber chickens in a trench coat
a group chat for haunted dolls
a turkey with excellent penmanship
a castle with terrible plumbing
a roller skate with opinions
a magic wand that needs batteries
a frog who only speaks in riddles
a babysitter for a sourdough starter
a submarine full of popcorn
eating cereal with a fork
my elaborate alibi about karaoke
a surprise visit from the Goose Police
a world record for missing the bus
a very small thunderstorm
my collection of decorative rocks
a candle that smells like homework
an out-of-tune ice cream truck
a flamingo at a job interview
a squirrel holding a tiny protest sign
a team of competitive librarians
a banana running for mayor
a lawsuit from the Tooth Fairy
a juice box with a warning label
an accordion wrapped in bubble wrap
twenty-five seconds of uninterrupted eye contact
a polite yet firm pigeon
three generations of waffle irons
my dad’s secret disco routine
fake mustaches for everyone
the last cheese puff in the universe
a dramatic reading of a waffle recipe
a pickle in a velvet tuxedo
a sleep mask for my goldfish
a wizard who only does card tricks
a racetrack for nervous snails
a very unlucky fortune cookie
a synchronized swimming team of corgis
my collection of almost matching socks
a goose pretending to be a duck
a carrot that refuses to commit
a six-foot inflatable trophy
a tiny car that honks in Morse code
a vampire afraid of ketchup
a twelve-step tutorial on opening a jar
a Ferris wheel that only goes backward
the moon’s embarrassing nickname
an interpretive dance about taxes
a toaster demanding creative control
four pancakes and an honest mistake
`);

export const unhingedPrompts = cards(`
The worst way to announce a breakup is ___.
Only one thing is going in my villain origin story tonight, and it’s ___.
Our new corporate wellness benefit is ___.
The reason I’m banned from the karaoke bar is ___.
The neighborhood app caught me doing ___.
My villain lair comes with a free subscription to ___.
My therapist had to take a walk after I mentioned ___.
“Our findings are alarming,” said the committee investigating ___.
I lost the election the moment the debate turned to ___.
The apocalypse was postponed due to ___.
The security footage clearly shows ___.
My resignation letter was mostly about ___.
`);

export const unhingedAnswers = cards(`
a séance to recover my security deposit
a hostile takeover of the office snack drawer
a passive-aggressive PowerPoint
an unsettling amount of mayonnaise
an HR complaint written as a limerick
a suspiciously specific fake funeral
my ex’s drum-and-bass phase
the raccoon I named as my legal counsel
getting canceled by a bowling league
creating a pyramid scheme for houseplants
a very lucrative public meltdown
a mandatory retreat to a haunted motel
a bar fight over artisanal jam
the office microwave’s revenge
a coupon for fifty percent off my dignity
a cryptid with a gambling problem
an angry puppet with access to payroll
unpaid emotional overtime
a vengeful cardboard cutout
a restraining order from the moon
drinking espresso at a hostage negotiation
a spectacularly cursed group chat
weaponized brunch
a board meeting held inside a bouncy castle
a real estate listing for my emotional baggage
a desperate attempt to tip the tax auditor
`);
