angular.module('multiStepForm')
/**
 * @ngdoc    directive
 * @name     multiStepForm:multiStepContainer
 *
 * @requires $scope
 * @requires multiStepForm:multiStepForm
 * @requires multiStepForm:FormStep
 * @requires multiStepForm:formStepElement
 *
 * @scope
 * @description Multi step directive (overall container)
 */
.directive('multiStepContainer', [
    '$animate',
    '$parse',
    '$q',
    '$log',
    'multiStepForm',
    'FormStep',
    'formStepElement',
    function ($animate, $parse, $q, $log, multiStepForm, FormStep, formStepElement) {
        return {
            restrict: 'EA',
            scope: true,
            /**
             * @ngdoc    controller
             * @name     multiStepForm:MultiStepFormCtrl
             *
             * @requires $scope
             * @requires multiStepForm:multiStepForm
             *
             * @description Controls a multi step form and track progress.
             */
            controller: [
                '$scope',
                function ($scope) {
                    /**
                     * @ngdoc    function
                     * @methodOf multiStepForm:MultiStepFormCtrl
                     *
                     * @description Register the step container element. This method
                     *              is invoked in the post link function of directive
                     *              {@link multiStepForm:formStepContainer formStepContainer}
                     * @param {JQLite} elm The step form container
                     */
                    this.setStepContainer = function (elm) {
                        this.stepContainer = elm;
                    };
                }
            ],
            link: {
                pre: function preLink(scope, element, attrs) {
                    /**
                     * @ngdoc       property
                     * @propertyOf  multiStepForm:MultiStepFormContainer
                     * @description The form steps
                     * @type  {FormStep[]}
                     */
                    scope.formSteps = scope.$eval(attrs.steps).map(function (step) {
                        return new FormStep(step);
                    });

                    /**
                     * @ngdoc       property
                     * @propertyOf  multiStepForm:MultiStepFormContainer
                     * @description The form step titles
                     * @type  {String[]}
                     */
                    scope.stepTitles = scope.formSteps.map(function (step) {
                        return step.title;
                    });
                },
                post: function postLink(scope, element, attrs, controller) {
                    function destroy() {
                        $animate.leave(element);
                        scope.$destroy();
                    }
                    // Check that a step container has been defined
                    if (attrs.useFooter !== undefined) {
                        $log.warn('useFooter attribute is no longer supported. Instead you need to define were you want your steps to be added.');
                    }
                    if (controller.stepContainer === undefined) {
                        $log.warn('You need to define a step container, using the stepContainer directive (element and attribute supported).');
                        $log.warn('See changelog: https://github.com/troch/angular-multi-step-form/blob/master/CHANGELOG.md');
                        $log.warn('See migration guide: https://github.com/troch/angular-multi-step-form/blob/master/docs/migrating-to-1.1.x.md');
                        throw new Error('Step container not found');
                    }
                    // Add .multi-step-container class
                    element.addClass('multi-step-container');
                    // Callbacks
                    var onFinish = attrs.onFinish ? $parse(attrs.onFinish).bind(scope, scope) : destroy,
                        onCancel = attrs.onCancel ? $parse(attrs.onCancel).bind(scope, scope) : destroy;
                    // Step container (populated by child post link function)
                    var stepContainer = controller.stepContainer,
                        multiStepFormInstance = multiStepForm(scope.$eval(attrs.searchId)),
                        // Initial step
                        initialStep = scope.$eval(attrs.initialStep);

                    var currentLeaveAnimation,
                        currentEnterAnimation,
                        currentStepScope,
                        currentStepElement;

                    // Augment scope
                    multiStepFormInstance.augmentScope(scope);

                    // Initialise and start the multi step form
                    multiStepFormInstance
                        .start(scope.formSteps)
                        .then(onFinish, onCancel, function (data) {
                            var step = data.newStep,
                                previousStep = data.oldStep,
                                direction = angular.isDefined(previousStep) ?
                                       (step < previousStep  ? 'step-backward' : 'step-forward') :
                                       'step-initial';

                            var formStep = scope.formSteps[step - 1],
                                // Create new step element (promise)
                                newStepElement = formStepElement(formStep, multiStepFormInstance, scope);

                            // Add direction class to the parent container;
                            stepContainer
                                .removeClass('step-forward step-backward step-initial')
                                .addClass(direction);

                            // Cancel current leave animation if any
                            if (currentLeaveAnimation) {
                                $animate.cancel(currentLeaveAnimation);
                            }
                            // Cancel current enter animation if any
                            if (currentEnterAnimation) {
                                $animate.cancel(currentEnterAnimation);
                            }
                            // Destroy current scope
                            if (currentStepScope) {
                                currentStepScope.$destroy();
                            }
                            // Leave current step if any
                            if (currentStepElement) {
                                currentLeaveAnimation = $animate.leave(currentStepElement);
                            }
                            // Enter new step when new step element is ready
                            newStepElement
                                .then(function (data) {
                                    currentStepScope = data.scope;
                                    currentStepElement = data.element;
                                    currentEnterAnimation = $animate.enter(currentStepElement, stepContainer);
                                }, function () {
                                    throw new Error('Could not load step ' + step);
                                });
                        });

                    // Initialise currentStep
                    multiStepFormInstance.setInitialIndex(initialStep);
                }
            }
        };

    }
]);
