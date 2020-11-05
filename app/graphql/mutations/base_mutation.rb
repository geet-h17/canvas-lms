# frozen_string_literal: true

#
# Copyright (C) 2018 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.
#

##
# = Base Canvas Mutation class
#
# The most fundamental change this class makes compared to
# +GraphQL::Schema::Mutation+ is that it facilitates conveniently following
# the convention of always taking a single input argument and returning a
# unique payload per mutation.
#
# Any arguments defined in a mutation descended from this class will be
# hoisted into a custom input object.  Fields on the mutation will similarly
# be hoisted into a custom payload object.
#
# An +errors+ field will be added to all payloads for validation errors.
class Mutations::BaseMutation < GraphQL::Schema::Mutation

  field :errors, [Types::ValidationErrorType], null: true

  def current_user
    context[:current_user]
  end

  def session
    context[:session]
  end

  def verify_authorized_action!(obj, perm)
    raise GraphQL::ExecutionError, 'not found' unless obj.grants_right?(current_user, session, perm)
  end

  # TODO: replace this with model validation where applicable
  def validation_error(message, attribute: 'message')
    {
      errors: {
        attribute.to_sym => message
      }
    }
  end

  private

  # returns validation errors in a consistent format (`Types::ValidationError`)
  #
  # validation errors on an attribute that match one of the mutation's input
  # fields will be returned with that attribute specified (otherwise
  # `attribute` will be null)
  def errors_for(model)
    # TODO - support renamed fields (e.g. workflow_state => state)
    input_fields = Hash[self.class.arguments.values.map { |a| [ a.keyword, a.name ] }]

    {
      errors: model.errors.entries.map { |attribute, message|
        [input_fields[attribute], message]
      }
    }
  end



  # this is copied from GraphQL::Schema::RelayClassicMutation - it moves all
  # the arguments defined with the ruby-graphql DSL into an auto-generated
  # input type
  #
  # this is a bit more convenient that defining the types by hand
  #
  # we could base this class on RelayClassicMutation but then we get the weird
  # {client_mutation_id} fields that we don't care about
  def self.field_options
    super.tap do |res|
      res[:arguments].clear
      res[:arguments][:input] = {type: input_type, required: true}
    end
  end

  def self.input_type
    @input_type ||= begin
                      mutation_args = arguments
                      mutation_name = graphql_name
                      mutation_class = self
                      Class.new(Types::BaseInputObject) do
                        graphql_name("#{mutation_name}Input")
                        description("Autogenerated input type of #{mutation_name}")
                        mutation(mutation_class)
                        own_arguments.merge!(mutation_args)
                      end
                    end
  end
end
