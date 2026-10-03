# Test strategy

- DTO: valid create, strict object, path format, endpoint URL, metadata/local URL.
- Manager: built-in regression and runtime NVIDIA NIM base/model-list behavior.
- Routing: custom provider identity through AUTO candidate filters.
- Frontend: translation registry and connector-provider selection regressions;
  run route build/typecheck and add a browser flow when the local stack is healthy.
- Prisma: schema validate and generate for both affected services.
- Final scoped checks: shared-types, connector-service, routing-service, frontend.
- Manual QA lanes L03-L15 require a healthy rebuilt local stack and are recorded
  individually. Unit tests do not close manual API/browser/UAT gaps.
