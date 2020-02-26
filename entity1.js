
/*
    Base entity class, parent to other enemies, used for drawing and checking collisions
    An easy way to draw an object is to instantiate it from an Entity class, assign an image, and render it in the Draw() method
    If you want to add more functionality to it, create a new child class from Entity
*/


/*
    *Change the hoop to the ball
    *Change the ball to the bat
*/

class Entity {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.rotation = 0;
        this.rotSpeed = 0;
        this.img;
        this.sizeMod = 1;
        this.removable = false;
        this.scale = createVector(1, 1);
    }


    render() {
        let size = objSize * this.sizeMod;
        this.rotation += this.rotSpeed;

        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.rotation);
        scale(this.scale.x, this.scale.y);
        image(this.img, -size / 2, -size / 2, size, size);
        pop();
    }

    hit(other) {
        let distX = abs(this.pos.x - other.pos.x);
        let distY = abs(this.pos.y - other.pos.y);

        let distCheck = (objSize * this.sizeMod + objSize * other.sizeMod) / 2;

        if (distX < distCheck && distY < distCheck) {
            return true;
        } else {
            return false;
        }
    }

}

//Our main ball // changing to bat
class Ball extends Entity {
    constructor(x, y) {
        super(x, y);

        this.falling = false;
        this.idle = true; //true before getting thrown
        this.velocity = createVector(0, 0);
        this.img = imgBall;
        this.startPos = createVector(x, y);
        this.previousPos = createVector(x, y);
        this.scale = createVector(2.25, 2.25);
        this.radius = objSize / 2;
        this.scored = false; //if the score or miss has been registered
        this.canThrow = false; //used to prevent getting thrown without grabbing the ball first

        this.animTimer = 0;

        this.sizeMod = 0.1;

    }

    update() {

        if (this.canThrow) {
            this.handleTouch();
        }

        if (this.animTimer < 1) {
            let animSpeed = 4;
            this.animTimer += 1 / frameRate() * animSpeed;
        }

        this.sizeMod = Ease(EasingFunctions.outBack, this.animTimer, 0, 1);

        this.previousPos = createVector(this.pos.x, this.pos.y);

        //Apply gravity after getting thrown
        if (!this.idle) {
            this.velocity.y += gravity * 1 / frameRate();
        }

        //rotate a bit based on horizontal velocity
        this.rotSpeed = this.velocity.x * 0.03;

        //Smooth movement
        if (this.idle && (this.pos.x != this.startPos.x || this.pos.y != this.startPos.y)) {
            this.pos.x = Smooth(this.pos.x, this.startPos.x, 8);
            this.pos.y = Smooth(this.pos.y, this.startPos.y, 8);
        }

        //Scale down over time after getting thrown to create the illusion of going away from the camera
        if (!this.idle) {
            this.scale.x = Smooth(this.scale.x, 1, 12);
            this.scale.y = Smooth(this.scale.y, 1, 12);


            if (this.velocity.y > 0) {
                this.falling = true;
            }
        }

        //remove idle flag after getting thrown
        if (this.idle && this.pos.y < this.startPos.y - objSize * 1.75) {

            this.idle = false;

            /*if (sndThrow) {
                sndThrow.setVolume(0.25);
                sndThrow.play();
            }*/

            //determine throw direction based on direction between current position and position in the previous frame
            let dir = createVector(this.pos.x - this.previousPos.x, this.pos.y - this.previousPos.y);
            dir.normalize();
            this.velocity = createVector(-dir.x * objSize * 0.175, -dir.y * objSize * 0.4);
        }

        //Check collision with both hoop sides while falling // collision with bat
        if (this.falling) {
            for (let i = 0; i < hoopSides.length; i++) {
                this.checkCollision(hoopSides[i]);
            }

            //===Push the ball to the center once it passes through the hoop and slow it down to make it seem like the net is more real
            if (this.pos.y > hoop.pos.y - objSize / 2 && this.pos.y < hoop.pos.y + objSize) {
                if (this.pos.x > hoopSides[0].pos.x && this.pos.x < hoopSides[1].pos.x) {
                    this.pos.x = Smooth(this.pos.x, boardPos, 2);

                    if (this.velocity.y > 3) {
                        this.velocity.y -= gravity * 1.5 * 1 / frameRate();
                    }

                }
            }

            //Score if the ball goes inside the hoop
            if (this.pos.y > hoopSides[0].pos.y + objSize / 2) {
                if (this.pos.x > hoopSides[0].pos.x && this.pos.x < hoopSides[1].pos.x) {
                    if (!this.scored) {
                        addScore(scoreGain * scoreGainModifier);
                        this.scored = true;
                        hoop.scale.x = 1.2;

                        if (!Koji.config.strings.ballCanPassThrough) {
                            spawnBall();
                        }


                        if (score > boardMoveStart) {
                            desiredBoardPos = random(width / 2 - objSize * 3, width / 2 + objSize * 3);
                        }
                    }
                } else {
                    //otherwise lose a life
                    if (!this.scored && this.pos.y > hoopSides[0].pos.y + objSize) {
                        loseLife();
                        this.scored = true;
                    }
                }
            }
        }

        //Move
        this.pos.add(this.velocity);

    }

    handleTouch() {
        //Drag the ball while touching
        if (touching) {
            if (this.idle) {
                this.pos.y = Smooth(this.pos.y, mouseY, 4);
                this.pos.x = Smooth(this.pos.x, mouseX, 4);

                //limit horizontal movement
                //this.pos.x = constrain(this.pos.x, this.startPos.x - objSize, this.startPos.x + objSize);

            }
        }
    }

    //Check if the ball is currently clicked/touched
    checkClick() {
        if (mouseX >= this.pos.x - objSize * this.sizeMod / 2 * this.scale.x &&
            mouseX <= this.pos.x + objSize * this.sizeMod / 2 * this.scale.y &&
            mouseY >= this.pos.y - objSize * this.sizeMod / 2 * this.scale.x &&
            mouseY <= this.pos.y + objSize * this.sizeMod / 2 * this.scale.y) {
            return true;
        } else {
            return false;
        }
    }


    //check collision with a hoop side
    checkCollision(other) {
        let distX = abs(this.pos.x - other.pos.x);
        let distY = abs(this.pos.y - other.pos.y);
        let distCheck = this.radius;

        if (this.pos.y < other.pos.y) {
            if (distX <= distCheck && distY <= distCheck) {

                //===BOUNCE
                let vel = createVector(this.velocity.x, this.velocity.y);
                let dirX = this.pos.x - other.pos.x;
                if (abs(dirX) < 1) {
                    dirX = Math.sign(dirX) * 1;
                }

                //Make the upwards bounces weaker if it's already falling inside, this prevents endless side bounces
                let modY = -0.3;
                if (this.pos.y > other.pos.y) {
                    modY = -0.05;
                }

                this.velocity = createVector(dirX * 0.15, vel.y * modY);

                //===Lower limit on velocity so it doesn't bounce too frequently
                if (abs(this.velocity.y) < objSize * 0.075) {
                    this.velocity.y = -objSize * 0.075;
                }

                if (sndCollision) {
                    sndCollision.setVolume(0.1); //set very low volume
                    sndCollision.play();
                }

            }
        }
    }
}

function addScore(amount) {
    score += amount;

    if (score % scoreIncreaseInterval == 0) {
        scoreGainModifier++;

        //===Choose a random scoreAdvanceText from the array
        let textID = floor(random() * scoreAdvanceText.length);
        let text = scoreAdvanceText[textID];
        floatingTexts.push(new FloatingText(boardPos, height / 2 - objSize * 4, text, Koji.config.colors.scoreColor, objSize * 1));

        sndIncrement.play();
    } else {


        if (sndScore) sndScore.play();
        //Display gained score
        floatingTexts.push(new FloatingText(boardPos, height / 2 - objSize * 4, amount, Koji.config.colors.scoreColor, objSize * 2));
    }

}

//Hoop, only serves as decoration
class Hoop extends Entity {
    constructor(x, y) {
        super(x, y);

        this.falling = false;
        this.idle = true; //true before getting thrown
        this.velocity = createVector(0, 0);
        this.img = imgHoop;
        this.startPos = createVector(x, y);
        this.previousPos = createVector(x, y);
        this.scale = createVector(2.25, 2.25);
        this.radius = objSize / 2;
        this.scored = false; //if the score or miss has been registered
        this.canThrow = false; //used to prevent getting thrown without grabbing the ball first

        this.animTimer = 0;

        this.sizeMod = 0.1;

    }

    update() {

        /*if (this.canThrow) {
            this.handleTouch();
        }*/

        if (this.animTimer < 1) {
            let animSpeed = 4;
            this.animTimer += 1 / frameRate() * animSpeed;
        }

        this.sizeMod = Ease(EasingFunctions.outBack, this.animTimer, 0, 1);

        this.previousPos = createVector(this.pos.x, this.pos.y);

        //Apply gravity after getting thrown
        if (!this.idle) {
            this.velocity.y += gravity * 1 / frameRate();
        }

        //rotate a bit based on horizontal velocity
        this.rotSpeed = this.velocity.x * 0.03;

        //Smooth movement
        if (this.idle && (this.pos.x != this.startPos.x || this.pos.y != this.startPos.y)) {
            this.pos.x = Smooth(this.pos.x, this.startPos.x, 8);
            this.pos.y = Smooth(this.pos.y, this.startPos.y, 8);
        }

        //Scale down over time after getting thrown to create the illusion of going away from the camera
        if (!this.idle) {
            this.scale.x = Smooth(this.scale.x, 1, 12);
            this.scale.y = Smooth(this.scale.y, 1, 12);


            if (this.velocity.y > 0) {
                this.falling = true;
            }
        }

        //remove idle flag after getting thrown
        if (this.idle && this.pos.y < this.startPos.y - objSize * 1.75) {

            this.idle = false;

            if (sndThrow) {
                sndThrow.setVolume(0.25);
                sndThrow.play();
            }

            //determine throw direction based on direction between current position and position in the previous frame
            let dir = createVector(this.previousPos.x - this.pos.x , this.previousPos.y - this.pos.y );
            dir.normalize();
            this.velocity = createVector(-dir.x * objSize * 0.175, -dir.y * objSize * 0.4);
        }

        //Check collision with both ball while falling // collision with bat
        if (this.falling) {
            for (let i = 0; i < Ball.length; i++) {
                this.checkCollision(Ball[i]);
            }

            //===Push the ball to the center once it passes through the hoop and slow it down to make it seem like the net is more real
            /*if (this.pos.y > Ball.pos.y - objSize / 2 && this.pos.y < Ball.pos.y + objSize) {
                if (this.pos.x > hoopSides[0].pos.x && this.pos.x < hoopSides[1].pos.x) {
                    this.pos.x = Smooth(this.pos.x, boardPos, 2);

                    if (this.velocity.y > 3) {
                        this.velocity.y -= gravity * 1.5 * 1 / frameRate();
                    }

                }
            }*/

            //Score if the ball goes inside the hoop
            if (this.pos.y > Ball[0].pos.y + objSize / 2) {
                if (this.pos.x > Ball[0].pos.x && this.pos.x < hoopSides[1].pos.x) {
                    if (!this.scored) {
                        addScore(scoreGain * scoreGainModifier);
                        this.scored = true;
                        hoop.scale.x = 1.2;

                        if (!Koji.config.strings.ballCanPassThrough) {
                            spawnBall();
                        }


                        if (score > boardMoveStart) {
                            desiredBoardPos = random(width / 2 - objSize * 3, width / 2 + objSize * 3);
                        }
                    }
                } else {
                    //otherwise lose a life
                    if (!this.scored && this.pos.y > Ball[0].pos.y + objSize) {
                        loseLife();
                        this.scored = true;
                    }
                }
            }
        }

        //Move
        this.pos.add(this.velocity);

    }

    /*handleTouch() {
        //Drag the ball while touching
        if (touching) {
            if (this.idle) {
                this.pos.y = Smooth(this.pos.y, mouseY, 4);
                this.pos.x = Smooth(this.pos.x, mouseX, 4);

                //limit horizontal movement
                //this.pos.x = constrain(this.pos.x, this.startPos.x - objSize, this.startPos.x + objSize);

            }
        }
    }*/

    //Check if the ball is currently clicked/touched
    /*checkClick() {
        if (mouseX >= this.pos.x - objSize * this.sizeMod / 2 * this.scale.x &&
            mouseX <= this.pos.x + objSize * this.sizeMod / 2 * this.scale.y &&
            mouseY >= this.pos.y - objSize * this.sizeMod / 2 * this.scale.x &&
            mouseY <= this.pos.y + objSize * this.sizeMod / 2 * this.scale.y) {
            return true;
        } else {
            return false;
        }
    }*/


    //check collision with a hoop side
    checkCollision(other) {
        let distX = abs(this.pos.x - other.pos.x);
        let distY = abs(this.pos.y - other.pos.y);
        let distCheck = this.radius;

        if (this.pos.y < other.pos.y) {
            if (distX <= distCheck && distY <= distCheck) {

                //===BOUNCE
                let vel = createVector(this.velocity.x, this.velocity.y);
                let dirX = this.pos.x - other.pos.x;
                if (abs(dirX) < 1) {
                    dirX = Math.sign(dirX) * 1;
                }

                //Make the upwards bounces weaker if it's already falling inside, this prevents endless side bounces
                let modY = -0.3;
                if (this.pos.y > other.pos.y) {
                    modY = -0.05;
                }

                this.velocity = createVector(dirX * 0.15, vel.y * modY);

                //===Lower limit on velocity so it doesn't bounce too frequently
                if (abs(this.velocity.y) < objSize * 0.075) {
                    this.velocity.y = -objSize * 0.075;
                }

                if (sndCollision) {
                    sndCollision.setVolume(0.1); //set very low volume
                    sndCollision.play();
                }

            }
        }
    }
}

//Hoop sides, important for collisions with ball
class HoopSide extends Entity {
    constructor(x, y) {
        super(x, y);

        this.radius = objSize / 10;
        this.side = Math.sign(this.pos.x - boardPos);
    }

    update() {
        this.pos.x = boardPos + objSize * hoopWidthModifier / 100 * this.side;
    }

    render() {
        //override parent, so it doesn't draw
    }
}

//===Floating text used for score
function FloatingText(x, y, txt, color, size) {
    this.pos = createVector(x, y);
    this.size = 1;
    this.maxSize = size;
    this.timer = 1;
    this.txt = txt;
    this.color = color;

    this.update = function () {

        if (this.timer > 0.3) {
            if (this.size < this.maxSize) {
                this.size = Smooth(this.size, this.maxSize, 2);
            }
        } else {
            this.size = Smooth(this.size, 0.1, 4);
        }


        this.timer -= 1 / frameRate();
    }

    this.render = function () {

        textSize(this.size);
        fill(this.color);
        textAlign(CENTER, BOTTOM);
        text(txt, this.pos.x, this.pos.y);
    }
}
