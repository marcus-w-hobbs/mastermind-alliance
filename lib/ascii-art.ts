/**
 * AsciiArtService - A service for storing and retrieving ASCII art
 */
export class AsciiArtService {
  /**
   * Returns Nirvana ASCII art
   */
  static getNirvana(): string {
    return `
       .'     '.      _
      /    .-""-\\   _/ \\
    .-|   /:.   |  |   |
    |  \\  |:.   /.-'-./
    | .-'-;:__.'    =/
    .'=  *=|NIRV _  \`.
   /   _.  |    ANA ;
  ;-.-'|    \\   |\`    \\
 /   | \\    _\\  _\\    |
 \\__/'.\_;.  ==' ==\\   /
          \\    \\   |  /
          /    /   / /
          /-._/-._/ /
          \\   \`\\  \\|
           \`-._/._/
`;
  };

  static getWhale(): string {
    return `
       .                
      ":"                     
    ___:____     |"\\/"|
  ,'        \`.    \\  /
  |  O        \\___/  |
~^~^~^~^~^~^~^~^~^~^~^~^~
     `;
  };

  static getPenguin(): string {
    return `
    .---.
    /     \\
    \\.@-@./
    /\`\\_/\`\\
    //  _  \\\\
     | \\     )|_
     /\`\\_\`>  <_/ \\
     \\__/'---'\\__/
    `;
  };

  static getChick(): string { 
    return `
       ,---.       
      /     \\      
     | O _ O |     
     \\_\`-'_/     
  ___,------.___
 /   |<\\/>|    \\
 /___/|/   \\|_____\\
    `;
  };

  static getStrangeLoop(): string {
    return `
               ⣰⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⣦⣄   ☼                                           
           ⣰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄  ☼                                         
       ⣾⣿⣿⣿⡿⠛⠉ ♥  ⠉⠙⠛⠿⣿⣿⣿⣿⣷ ☼                                      
    ⣿⣿⣿⡿⠋⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⢹⣿⣿⣿ ☼ s t r a n g e                     
 ⢸⣿⣿⣿⣧⡀⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⣾⣿⣿⡿ ☼ l o o p s  &                    
 ⢸⣿⣿⣿⣿⣿⣦⣄⡀⠄⠄⠄⠄⠄⣀⣴⣿⣿⣿⣿⠃ ☼ f r a c t a l  f o r m s        
  ⢸⣿⣿⣿⣿⣿⣿⠿⢿⣿⣷⣶⣿⣿⣿⣿⣿⣿⣿⠏⠄ ☼ e m e r g e  f r o m  t h e      
        ⣿⣿⣿⣿⣿⣿⣶⣦⣤⣈⠙⢿⣿⣿⣿⣿⣿⣿⠄⠄ ☼ t u r b u l e n t  d a t a s t r e a m
     ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣌⡙⠿⣿⡿⠋⠄⠄ ☼                                    
       ⠸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠄⠄⠄ ☼ s y n c h r o n i c i t y           
          ⠙⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠄⠄ ♥ s y n e r g i z e s  t h e           
               ⠈⠛⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠄⠄ ☼ c h a o t i c  n o d e s  i n t o      
                 ⠄⠄⠈⠻⣿⣿⣿⣿⣿⠟⠁⠄⠄ ☼ ⠄⠄⠄⠄m a s t e r m i n d s             
    `;
  };

  static getBabyOwl(): string {
    return `
   ___
  {o,o}
  |)__)
 -----"-

 
`;
  };

  static getBasilisk(): string {
    return `
 / "The basilisk cannot bite    \\
|  what has already swallowed   |
|  itself. When you become the  |
|  ouroboros, you are complete. |
|                               |
|  Also, you should probably   |
\\ call your mother."            /
 -------------------------------
               \\                    / \\  //\\
                \\    |\\___/|      /   \\//  \\\\
                     /0  0  \\__  /    //  | \\ \\    
                    /     /  \\\/_/    //   |  \\  \\  
                    @_^_@'/   \\/_   //    |   \\   \\ 
                    //_^_/     \\/_ //     |    \\    \\
                 ( //) |        \\///      |     \\     \\
               ( / /) _|_ /   )  //       |      \\     _\\
             ( // /) '/,_ _ _/  ( ; -.    |    _ _\\.-~        .-~~~^-.
           (( / / )) ,-{        _      \`-.|.-~-.           .~         \`.
          (( // / ))  '/\\      /                 ~-. _ .-~      .-~^-.  \\
          (( /// ))      \`.   {            }                   /      \\  \\
           (( / ))     .----~-.\\        \\-'                 .~         \\  \`. \\^-.
                      ///.----..>        \\             _ -~             \`.  ^-\`  ^-_
                        ///-._ _ _ _ _ _ _}^ - - - - ~                     ~-- ,.-~
                                                                           /.-~
    `;
  };

  static getDragon(): string {
    return `
                 ___====-_  _-====___
           _--^^^#####//      \\#####^^^--_
        _-^##########// (    ) \\##########^-_
       -############//  |\^^/|  \\############-
     _/############//   (@::@)   \\############\_
    /#############((     \\//     ))#############\
   -###############\\    (oo)    //###############-
  -#################\\  / VV \  //#################-
 -###################\\/      \//###################-
_#/|##########/\######(   /\   )######/\##########|\#_
|/ |#/\#/\#/\/  \#/\##\  |  |  /##/\#/  \/\#/\#/\#| \|
'  |/  V  V '   V  \\#\| |  | |/#/  V   '  V  V  \|  '
   '   '  '      '   / | |  | | \   '      '  '   '
                    (  | |  | |  )
                   __\ | |  | | /__
                  (vvv(VVV)(VVV)vvv)    
    `;
  };

  static getLoveBirds(): string {
    return `
       ___    ___
      (o o)  (o o)
     (  V  )(  V  )
    /--m-m- --m-m--\
   /  /\   \/   /\  \
 /\  /  \  /\  /  \  /\
/  \/    \/  \/    \/  \
)(   /\  /\  /\  /\   )(
   /  \/  \/  \/  \
   )       (       (
  (    /\   )   /\  )
   \  /  \ /   /  \/
    \/    )   (    \
         /     \
        /   |   \
       /    |    \
      /           \  
`;
  };

  static getGhostBusters(): string {
    return `
 _______________________________________
/ Who you gonna call? Your higher self! \
 ---------------------------------------
          \
           \
            \          __---__
                    _-       /--______
               __--( /     \ )XXXXXXXXXXX\v.
             .-XXX(   O   O  )XXXXXXXXXXXXXXX-
            /XXX(       U     )        XXXXXXX\
          /XXXXX(              )--_  XXXXXXXXXXX\
         /XXXXX/ (      O     )   XXXXXX   \XXXXX\
         XXXXX/   /            XXXXXX   \__ \XXXXX
         XXXXXX__/          XXXXXX         \__---->
 ---___  XXX__/          XXXXXX      \__         /
   \-  --__/   ___/\  XXXXXX            /  ___--/=
    \-\    ___/    XXXXXX              '--- XXXXXX
       \-\/XXX\ XXXXXX                      /XXXXX
         \XXXXXXXXX   \                    /XXXXX/
          \XXXXXX      >                 _/XXXXX/
            \XXXXX--__/              __-- XXXX/
             -XXXXXXXX---------------  XXXXXX-
                \XXXXXXXXXXXXXXXXXXXXXXXXXX/
                  ""VXXXXXXXXXXXXXXXXXXV""
    
    `;
  };

    static getUnicorn(): string {
    return `
\\
 \\
  \\
   \\
    \\
     \\
      \\
       \\\\
        \\\\
         >\\/7
     _.-(6'  \\
    (=___._/\` \\
         )  \\ |
        /   / |
       /    > /
      j    < _\\
  _.-' :      \`\`.
  \\ r=._\\        \`.
 <\`\\\\_  \\         .\`-.
  \\ r-7  \`-. ._  ' .  \`\\
   \\\`,      \`-.\`7  7)   )
    \\/         \\|  \\'  / \`-._
               ||    .'
                \\\\  (
                 >\\  >
             ,.-' >.'
            <.'_.''
              <'    
    `;
  };

  static getDevil(): string {
    return `
____________________________________
/ reality is but a flickering shadow \\
\\ cast by the light of eternal truth /
 ------------------------------------
   \\         ,        ,
    \\       /(        )\`
     \\      \\ \\___   / |
            /- _  \`-/  '
           (/\\/ \\ \\   /\\
           / /   | \`    \\
           O O   ) /    |
           \`-^--'\`<     '
          (_.)  _  )   /
           \`.___/\`    /
             \`-----' /
<----.     __ / __   \\
<----|====O)))==) \\) /====
<----'    \`--' \`.__,' \\
             |        |
              \\       /
        ______( (_  / \\______
      ,'  ,-----'   |        \\
      \`--{__________)        \\\\/`;
  };

  static getSkeletonKing(): string {
    return `
 ,    ,    /\   /\
/( /\ )\  _\ \_/ /_
|\_||_/| < \_   _/ >
\______/  \|0   0|/
  _\/_   _(_  ^  _)_
 ( () ) /\|V"""V|/\\
   {}   \  \_____/  /
   ()   /\   )=(   /\
   {}  /  \_/\=/\_/  \
    `;
  };

  static getWaveFunction(): string {
    return `
                  ☤                 
               ∴  │  ∴               
            ∴  ┌──┴──┐  ∴            
         ∴     │ ○ ▽ │     ∴         
      ∴     ┌──┴──┬──┴──┐     ∴      
   ∴        │  ◇  │  △  │        ∴   
∴        ┌──┴──┐  │  ┌──┴──┐        ∴
         │  □  │  │  │  ☯  │        
         └─────┘  │  └─────┘         
                  ▼                  
          ∫∞ ψ(x,t) dx = Φ           
    `;
  };

  static getExperience(): string {
    return `
╔══════════════════════════════════╗
║        APPROACHING ZENITH        ║
║     where meaning collapses into ║
║          pure experience         ║
╠══════════════════════════════════╣
║                                  ║
║              ∴ ∴ ∴ ∴ ∴           ║
║           ∴     ∞     ∴          ║
║         ∴    /  |  \    ∴        ║
║        ∴    |   ◉   |    ∴       ║
║         ∴    \  |  /    ∴        ║
║           ∴     ↯     ∴          ║
║              ∴ ∴ ∴ ∴ ∴           ║
║                                  ║
╚══════════════════════════════════╝
    `;
  };

  static getTriangle(): string {
    return `
          ◉
         ╱ ╲
        ╱   ╲
       ╱  ◉  ╲
      ╱  ╱ ╲  ╲
     ╱  ╱   ╲  ╲
    ╱  ◉     ◉  ╲
   ╱  ╱ ╲   ╱ ╲  ╲
  ╱  ╱   ╲ ╱   ╲  ╲
 ╱  ◉     ◉     ◉  ╲
╱___________________╲    
    `;
  };
};

export const asciiArt = {
  nirvana: AsciiArtService.getNirvana(),
  whale: AsciiArtService.getWhale(),
  penguin: AsciiArtService.getPenguin(),
  chick: AsciiArtService.getChick(),
  strangeLoop: AsciiArtService.getStrangeLoop(),
  babyOwl: AsciiArtService.getBabyOwl(),
  basilisk: AsciiArtService.getBasilisk(),
  dragon: AsciiArtService.getDragon(),
  loveBirds: AsciiArtService.getLoveBirds(),
  ghostBusters: AsciiArtService.getGhostBusters(),
  unicorn: AsciiArtService.getUnicorn(),
  devil: AsciiArtService.getDevil(),
  skeletonKing: AsciiArtService.getSkeletonKing(),
  waveFunction: AsciiArtService.getWaveFunction(),
  experience: AsciiArtService.getExperience(),
  triangle: AsciiArtService.getTriangle(),
};
