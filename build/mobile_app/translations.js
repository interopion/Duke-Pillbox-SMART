/* global App */
App.localize(
    [
        {
            "language":"English",
            "langAbbr":"en-US",
            "dir":"ltr",
            "failback":"en-US",
            "enabled":true,
            "nativeName":"English"
        },
        {
            "language":"Spanish",
            "langAbbr":"es",
            "dir":"ltr",
            "failback":"en-US",
            "enabled":true,
            "nativeName":"Español"
        },
        {
            "language":"Bulgarian",
            "langAbbr":"bg",
            "dir":"ltr",
            "failback":"en-US",
            "enabled":false,
            "nativeName":"Български"
        }
    ],
    {
        "common": {
            "language": {
                "en-US":"Language",
                "es":"Lenguaje",
                "bg":"Език"
            },
            "select_language":{
                "en-US":"Select Language",
                "es":"Seleccione el idioma",
                "bg":"Изберете Език"
            },
            "item_deleted":{
                "en-US":"Item Deleted",
                "es":"Elemento eliminado",
                "bg":"Лекарството е изтрито<br>"
            },
            "weekly":{
                "en-US":"Weekly",
                "es":"Cada Semana",
                "bg":"Седмично"
            },
            "noon":{
                "en-US":"Noon",
                "es":"Mediodía",
                "bg":"Обед<br>"
            },
            "morning":{
                "en-US":"Morning",
                "es":"En a la Mañana",
                "bg":"Сутрин"
            },
            "bedtime":{
                "en-US":"Bedtime",
                "es":"Hora de acostarse",
                "bg":"Преди лягане<br>"
            },
            "evening":{
                "en-US":"Evening",
                "es":"Noche",
                "bg":"Вечер"
            },
            "patient":{
                "en-US":"Patient",
                "es":"Paciente",
                "bg":"Пациент"
            },
            "in":{
                "en-US":"in",
                "es":"en",
                "bg":"в"
            },
            "replay":{
                "en-US":"Replay",
                "es":"Repetición",
                "bg":"Повтори на запис"
            },
            "try_again":{
                "en-US":"Try Again",
                "es":"Inténtalo De Nuevo",
                "bg":"Опитай пак<br>"
            },
            "Error":{
                "en-US":"Error",
                "es":"Error",
                "bg":"Грешка"
            },
            "AsNeeded":{
                "en-US":"As Needed",
                "es":"Según Sea Necesario",
                "bg":"При нужда<br>"
            },
            "Close":{
                "en-US":"Close",
                "es":"Concluir",
                "bg":"Затвори"
            },
            "report_taken_meds":{
                "en-US":"Report meds taken today",
                "es":"Medicamentos Informe tomada hoy",
                "bg":"Какви лекарства взех днес"
            },
            "give_feedback":{
                "en-US":"Give us feedback",
                "es":"Nos dan una respuesta",
                "bg":"Изпрати ни съобщение"
            },
            "send":{
                "en-US":"Send",
                "es":"Enviar",
                "bg":"Изпрати"
            },
            "cancel":{
                "en-US":"Cancel",
                "es":"Cancelar",
                "bg":"Откажи"
            }
        },
        "headerButtons":{
            "record":{
                "en-US":"Record",
                "es":"Registro",
                "bg":"Запиши"
            },
            "check":{
                "en-US":"Check",
                "es":"Comprobar",
                "bg":"Провери"
            },
            "hint":{
                "en-US":"Hint",
                "es":"Indicio",
                "bg":"Подскажи"
            },
            "help":{
                "en-US":"Help",
                "es":"Ayuda",
                "bg":"Помощ"
            },
            "clear":{
                "en-US":"Clear",
                "es":"Despejar",
                "bg":"Изчисти"
            },
            "finish":{
                "en-US":"Finish",
                "es":"Terminar",
                "bg":"Край"
            },
            "print":{
                "en-US":"Print",
                "es":"Imprimir",
                "bg":"Принтирай"
            },
            "scan":{
                "en-US":"Scan QR Code",
                "es":"Escanear código QR",
                "bg":"Сканирай"
            }
        },
        "dialogs":{
            "help":{
                "title":{
                    "en-US":"Help",
                    "es":"Ayuda",
                    "bg":"Помощ"
                },
                "paragraph1":{
                    "en-US":"Drag and drop each pill to its appropriate box.",
                    "es":"Arrastre y coloque cada pastilla a su casilla correspondiente.",
                    "bg":"Можете да \"влачите\" всяко лекарство до съответният контейнер.<br>"
                },
                "li1":{
                    "en-US":"The 1st clock-box is the <b>morning dose</b>",
                    "es":"El reloj de la caja primero es la dosis de la mañana",
                    "bg":"Първият контейнер е за лекарства, които се приемат <b>сутрин</b>.<br>"
                },
                "li2":{
                    "en-US":"The 2nd clock-box is the <b>noon/afternoon/mid-day dose</b>",
                    "es":"La segunda caja de reloj es la dosis del mediodía y de la tarde",
                    "bg":"Вторият контейнер е за лекарства, които се приемат <b>на обяд</b>."
                },
                "li3":{
                    "en-US":"The 3rd clock-box is the <b>evening dose</b>",
                    "es":"La tercera reloj de caja es la dosis de la tarde",
                    "bg":"Третият контейнер е за лекарства, които се приемат <b>вечер</b>."
                },
                "li4":{
                    "en-US":"The 4th box is <b>bedtime</b>",
                    "es":"La cuarta casilla es la hora de dormir",
                    "bg":"Четвъртият контейнер е за лекарства приемани <b>преди лягане</b>."
                },
                "li5":{
                    "en-US":"The 5th box is for pills that are to be taken <b>once per week</b>",
                    "es":"La quinta casilla es para pastillas que se deben tomar una vez por semana",
                    "bg":"Петият контейнер е за лекарства приемани <b>веднъж седмично</b>."
                },
                "li6":{
                    "en-US":"The 6th box is for pills that can be taken <b>as needed</b>",
                    "es":"La sexta casilla es para las pastillas que se pueden tomar cuando sea necesario",
                    "bg":"Шестият контейнер е за лекарства приемани <b>при нужда</b>."
                },
                "li7":{
                    "en-US":"To <b>double</b> a dose, drag the pill <b>twice</b>, to place <b>two</b> pills into a single box.",
                    "es":"Para duplicar una dosis, arrastre la pastilla dos veces, para colocar dos pastillas &nbsp;en una sola caja.",
                    "bg":"При нужда може да слагате повече от едно лекарство в контейнер."
                },
                "li8":{
                    "en-US":"If you make a mistake, you can drag a pill to the <b>Recycle/Trash bin</b> on the lower right hand corner.",
                    "es":"Si comete un error, puede arrastrar una pastilla &nbsp;a la papelera / papelera de reciclaje en la esquina inferior derecha.",
                    "bg":"За да изтриете сгрешено лекарство може да го преместите в кошчето.<br>"
                },
                "li9":{
                    "en-US":"If you need a hint as to the correct placement of the pills, click on the <b>&quot;Hint&quot;</b> button at the top. You will see the pills correctly placed in the boxes. To return to filling the box, click the <b>&quot;Hint&quot;</b> button once more.",
                    "es":"Si necesita una pista sobre la correcta colocación de las pastillas, haga clic en el botón \"Pista\" en la parte superior. Verá las pastillas colocadas correctamente en las cajas. Para volver a llenar la caja, haga clic en el botón \"Pista\" una vez más.",
                    "bg":"Ако имате нужда от помощ, може да натиснете бутона \"<b>Подскажи</b>\". Ще видите всички лекарства подредени по правилният начин. За да продължите, натиснете \"<b>Подскажи</b>\" бутона още веднъж.<br>"
                },
                "li10":{
                    "en-US":"Click the <b>&quot;Check&quot;</b> button to check your work. Boxes that have been filled incorrectly, will turn red.",
                    "es":"Haga clic en el botón \"Check\" para comprobar su trabajo. Las cajas que han sido llenados incorrectamente, se volverán rojas.",
                    "bg":"Бутона \"<b>Провери</b>\" включва проверка на вашите действия. Правилно подредените контейнери ще бъдат оцветени в зелено, а неправилните в червено. <br>"
                },
                "li11":{
                    "en-US":"If you need to clear all of pills from the pillbox at once, click on the <b>&quot;Clear&quot;</b> button.",
                    "es":"Si necesita borrar todas las pastillas del fort��n a la vez, haga clic en \"Borrar\" Cuando haya terminado con esta sesión de aprendizaje, haga clic en el botón Finalizar.",
                    "bg":"Ако желаете да изпразните всички контейнери, натиснете бутона \"<b>Изчисти</b>\".<br>"
                },
                "footer":{
                    "en-US":"When you are finished with this learning session, click the <b>Finish</b> button.",
                    "es":"Cuando haya terminado con esta sesión de aprendizaje, haga clic en el botón Salir Finalizar o en la parte superior de la pantalla.",
                    "bg":"Когато сте готови, натиснете бутонът \"<b>Край</b>\", за да запазите данните.<br>"
                }
            },
            "wellcome":{
                "title":{
                    "en-US":"Welcome",
                    "es":"Bienvenido",
                    "bg":"Добре дошли<br>"
                },
                "contents":{
                    "en-US":"Welcome to the Duke Pillbox skill-based learning module! The Duke Pillbox module is an interactive tool designed to help patients develop skills for self-management of medication regimens. This list of your prescribed medications is from the electronic health record, and should match the list from your pharmacy.",
                    "es":"Bienvenido al módulo de aprendizaje Duke Pillbox! El módulo de Duke Pillbox es una herramienta interactiva diseñada para ayudar a los pacientes a desarrollar habilidades para la autogestión de los regímenes de medicación. Esta lista de sus medicamentos recetados es de la historia clínica electrónica, y debe coincidir con la lista de su farmacia.",
                    "bg":"Добре дошли в <b>Duke Pillbox</b> модулът за обучение! Duke Pillbox е интерактивно приложение проектирано да помогне на пациентите да развиват sdasdas своите способности за работа с лекарства. Това е списък с вашите лекарства извлечен от електронния регистър и би трябвало да съвпада с вашите рецепти."
                },
                "startButton":{
                    "en-US":"GET STARTED",
                    "es":"EMPEZAR",
                    "bg":"НАЧАЛО"
                }
            },
            "scan":{
                "en-US":"Welcome to the Duke Pillbox skill-based learning module! Please click the button below to scan QR code and start your exercise.",
                "es":"Bienvenido al módulo de aprendizaje basado en la habilidad-Pastillero Digital! Por favor, haga clic en el botón de abajo para leer un código QR y comenzar su ejercicio.",
                "bg":"Добре дошли в Duke Pillbox. Натиснете бутона по-долу за да започнете със сканиране на QR кода. <br>"
            },
            "thankyou":{
                "title":{
                    "en-US":"Thank You",
                    "es":"Gracias",
                    "bg":"Благодарим ви"
                },
                "contents":{
                    "en-US":"Thank you for using the Duke Pillbox Module. Please be sure to record your evaluation of the learning session.",
                    "es":"Gracias por utilizar el Módulo de Duke Pillbox. Por favor, asegúrese de registrar su evaluación de la sesión de aprendizaje.",
                    "bg":"Благодарим ви че използвахте Duke Pillbox."
                }
            }
        }
    }
);
